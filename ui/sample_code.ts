export const sampleCode = `import io
from collections import deque
from pathlib import Path
from typing import Dict, List, Union

import cv2
import multiprocessing
import multiprocessing.connection
import time
import gym
import tensorflow as tf
import numpy as np
from matplotlib import pyplot

import os

os.environ["CUDA_VISIBLE_DEVICES"] = "1"

class Orthogonal(object):
    def __init__(self, scale=1.):
        self.scale = scale

    def __call__(self, shape, dtype=None, partition_info=None):
        shape = tuple(shape)
        if len(shape) == 2:
            flat_shape = shape
        elif len(shape) == 4:  # assumes NHWC
            flat_shape = (np.prod(shape[:-1]), shape[-1])
        else:
            raise NotImplementedError
        a = np.random.normal(0.0, 1.0, flat_shape)
        u, _, v = np.linalg.svd(a, full_matrices=False)
        q = u if u.shape == flat_shape else v  # pick the one with the correct shape
        q = q.reshape(shape)
        return (self.scale * q[:shape[0], :shape[1]]).astype(np.float32)

    def get_config(self):
        return {
            'scale': self.scale
        }


class Game(object):
    def __init__(self, seed: int):
        self.env = gym.make('BreakoutNoFrameskip-v4')
        self.env.seed(seed)

        self.obs_2_max = np.zeros((2, 84, 84, 1), np.uint8)

        self.obs_4 = np.zeros((84, 84, 4))

        self.rewards = []

        self.lives = 0

    def step(self, action):

        reward = 0.
        done = None

        for i in range(4):
            obs, r, done, info = self.env.step(action)

            if i >= 2:
                self.obs_2_max[i % 2] = self._process_obs(obs)

            reward += r

            lives = self.env.unwrapped.ale.lives()
            if lives < self.lives:
                done = True
            self.lives = lives

            if done:
                break

        self.rewards.append(reward)

        if done:
            episode_info = {"reward": sum(self.rewards),
                            "length": len(self.rewards)}
            self.reset()
        else:
            episode_info = None
            obs = self.obs_2_max.max(axis=0)

            self.obs_4 = np.roll(self.obs_4, shift=-1, axis=-1)
            self.obs_4[..., -1:] = obs

        return self.obs_4, reward, done, episode_info

    def reset(self):
        obs = self.env.reset()

        obs = self._process_obs(obs)
        self.obs_4[..., 0:] = obs
        self.obs_4[..., 1:] = obs
        self.obs_4[..., 2:] = obs
        self.obs_4[..., 3:] = obs
        self.rewards = []

        self.lives = self.env.unwrapped.ale.lives()

        return self.obs_4

    @staticmethod
    def _process_obs(obs):
        obs = cv2.cvtColor(obs, cv2.COLOR_RGB2GRAY)
        obs = cv2.resize(obs, (84, 84), interpolation=cv2.INTER_AREA)
        return obs[:, :, None]  # Shape (84, 84, 1)


def worker_process(remote: multiprocessing.connection.Connection, seed: int):
    game = Game(seed)

    while True:
        cmd, data = remote.recv()
        if cmd == "step":
            remote.send(game.step(data))
        elif cmd == "reset":
            remote.send(game.reset())
        elif cmd == "close":
            remote.close()
            break
        else:
            raise NotImplementedError


class Worker(object):
    child: multiprocessing.connection.Connection
    process: multiprocessing.Process

    def __init__(self, seed):
        self.child, parent = multiprocessing.Pipe()
        self.process = multiprocessing.Process(target=worker_process, args=(parent, seed))
        self.process.start()


class Model(object):
    def __init__(self, *, reuse: bool, batch_size: int):
        self.obs = tf.placeholder(shape=(batch_size, 84, 84, 4), name="obs", dtype=np.uint8)
        obs_float = tf.to_float(self.obs, name="obs_float")

        with tf.variable_scope("model", reuse=reuse):
            self.h = Model._cnn(obs_float)
            self.pi_logits = Model._create_policy_network(self.h, 4)

            self.value = Model._create_value_network(self.h)

            self.params = tf.trainable_variables()

        self.action = Model._sample(self.pi_logits)

        self.neg_log_pi = self.neg_log_prob(self.action, "neg_log_pi_old")

        self.policy_entropy = Model._get_policy_entropy(self.pi_logits)

    @staticmethod
    def _get_policy_entropy(logits: tf.Tensor):
        a = logits - tf.reduce_max(logits, axis=-1, keepdims=True)
        exp_a = tf.exp(a)
        z = tf.reduce_sum(exp_a, axis=-1, keepdims=True)
        p = exp_a / z

        return tf.reduce_sum(p * (tf.log(z) - a), axis=-1)

    def neg_log_prob(self, action: tf.Tensor, name: str) -> tf.Tensor:
        one_hot_actions = tf.one_hot(action, 4)
        return tf.nn.softmax_cross_entropy_with_logits_v2(
            logits=self.pi_logits,
            labels=one_hot_actions,
            dim=-1,
            name=name)

    @staticmethod
    def _sample(logits: tf.Tensor):
        uniform = tf.random_uniform(tf.shape(logits))
        return tf.argmax(logits - tf.log(-tf.log(uniform)),
                         axis=-1,
                         name="action")

    @staticmethod
    def _cnn(unscaled_images: tf.Tensor):
        scaled_images = tf.cast(unscaled_images, tf.float32) / 255.

        h1 = tf.layers.conv2d(scaled_images,
                              name="conv1",
                              filters=32,
                              kernel_size=8,
                              kernel_initializer=Orthogonal(scale=np.sqrt(2)),
                              strides=4,
                              padding="valid",
                              activation=tf.nn.relu)

        h2 = tf.layers.conv2d(h1,
                              name="conv2",
                              filters=64,
                              kernel_size=4,
                              kernel_initializer=Orthogonal(scale=np.sqrt(2)),
                              strides=2,
                              padding="valid",
                              activation=tf.nn.relu)

        h3 = tf.layers.conv2d(h2,
                              name="conv3",
                              filters=64,
                              kernel_size=3,
                              kernel_initializer=Orthogonal(scale=np.sqrt(2)),
                              strides=1,
                              padding="valid",
                              activation=tf.nn.relu)

        nh = np.prod([v.value for v in h3.get_shape()[1:]])
        flat = tf.reshape(h3, [-1, nh])

        h = tf.layers.dense(flat, 512,
                            activation=tf.nn.relu,
                            kernel_initializer=Orthogonal(scale=np.sqrt(2)),
                            name="hidden")

        return h

    @staticmethod
    def _create_policy_network(h: tf.Tensor, n: int) -> tf.Tensor:
        return tf.layers.dense(h, n,
                               activation=None,
                               kernel_initializer=Orthogonal(scale=0.01),
                               name="logits")

    @staticmethod
    def _create_value_network(h: tf.Tensor) -> tf.Tensor:
        value = tf.layers.dense(h, 1,
                                activation=None,
                                kernel_initializer=Orthogonal(),
                                name="value")
        return value[:, 0]

    def step(self, session: tf.Session, obs: np.ndarray) -> (tf.Tensor, tf.Tensor, tf.Tensor):
        return session.run([self.action, self.value, self.neg_log_pi],
                           feed_dict={self.obs: obs})

    def get_value(self, session: tf.Session, obs: np.ndarray) -> tf.Tensor:
        return session.run(self.value,
                           feed_dict={self.obs: obs})


class Trainer(object):
    def __init__(self, model: Model):
        self.model = model

        self.sampled_obs = self.model.obs

        self.sampled_action = tf.placeholder(dtype=tf.int32, shape=[None], name="sampled_action")
        self.sampled_return = tf.placeholder(dtype=tf.float32, shape=[None], name="sampled_return")

        self.sampled_normalized_advantage = tf.placeholder(dtype=tf.float32, shape=[None],
                                                           name="sampled_normalized_advantage")

        self.sampled_neg_log_pi = tf.placeholder(dtype=tf.float32, shape=[None], name="sampled_neg_log_pi")
        self.sampled_value = tf.placeholder(dtype=tf.float32, shape=[None], name="sampled_value")

        self.learning_rate = tf.placeholder(dtype=tf.float32, shape=[], name="learning_rate")

        self.clip_range = tf.placeholder(dtype=tf.float32, shape=[], name="clip_range")

        neg_log_pi = self.model.neg_log_prob(self.sampled_action, "neg_log_pi")

        ratio = tf.exp(self.sampled_neg_log_pi - neg_log_pi, name="ratio")

        clipped_ratio = tf.clip_by_value(ratio, 1.0 - self.clip_range, 1.0 + self.clip_range, name="clipped_ratio")
        self.policy_reward = tf.reduce_mean(tf.minimum(ratio * self.sampled_normalized_advantage,
                                                       clipped_ratio * self.sampled_normalized_advantage),
                                            name="policy_reward")

        self.entropy_bonus = tf.reduce_mean(self.model.policy_entropy, name="entropy_bonus")

        value = self.model.value

        clipped_value = tf.add(self.sampled_value,
                               tf.clip_by_value(value - self.sampled_value, -self.clip_range, self.clip_range),
                               name="clipped_value")
        self.vf_loss = tf.multiply(0.5,
                                   tf.reduce_mean(tf.maximum(tf.square(value - self.sampled_return),
                                                             tf.square(clipped_value - self.sampled_return))),
                                   name="vf_loss")

        self.loss = -(self.policy_reward - 0.5 * self.vf_loss + 0.01 * self.entropy_bonus)

        params = self.model.params
        grads, _ = tf.clip_by_global_norm(tf.gradients(self.loss, params), 0.5)

        adam = tf.train.AdamOptimizer(learning_rate=self.learning_rate, epsilon=1e-5)
        grads_and_vars = list(zip(grads, params))
        self.train_op = adam.apply_gradients(grads_and_vars, name="apply_gradients")

        self.approx_kl_divergence = .5 * tf.reduce_mean(tf.square(neg_log_pi - self.sampled_neg_log_pi))
        self.clip_fraction = tf.reduce_mean(tf.to_float(tf.greater(tf.abs(ratio - 1.0), self.clip_range)))

        self.train_info_labels = ['policy_reward',
                                  'value_loss',
                                  'entropy_bonus',
                                  'approx_kl_divergence',
                                  'clip_fraction']

    def train(self, session: tf.Session, samples: Dict[str, np.ndarray], learning_rate: float, clip_range: float):
        feed_dict = {self.sampled_obs: samples['obs'],
                     self.sampled_action: samples['actions'],
                     self.sampled_return: samples['values'] + samples['advantages'],
                     self.sampled_normalized_advantage: Trainer._normalize(samples['advantages']),
                     self.sampled_value: samples['values'],
                     self.sampled_neg_log_pi: samples['neg_log_pis'],
                     self.learning_rate: learning_rate,
                     self.clip_range: clip_range}

        evals = [self.policy_reward,
                 self.vf_loss,
                 self.entropy_bonus,
                 self.approx_kl_divergence,
                 self.clip_fraction,
                 self.train_op]

        return session.run(evals, feed_dict=feed_dict)[:-1]

    @staticmethod
    def _normalize(adv: np.ndarray):
        return (adv - adv.mean()) / (adv.std() + 1e-8)


class Main(object):
    def __init__(self):
        self.gamma = 0.99
        self.lamda = 0.95

        self.updates = 10000

        self.epochs = 4
        self.n_workers = 8
        self.worker_steps = 128
        self.n_mini_batch = 4
        self.batch_size = self.n_workers * self.worker_steps
        self.mini_batch_size = self.batch_size // self.n_mini_batch
        assert (self.batch_size % self.n_mini_batch == 0)

        Main._init_tf_session()

        self.workers = [Worker(47 + i) for i in range(self.n_workers)]

        self.obs = np.zeros((self.n_workers, 84, 84, 4), dtype=np.uint8)
        for worker in self.workers:
            worker.child.send(("reset", None))
        for i, worker in enumerate(self.workers):
            self.obs[i] = worker.child.recv()

        self.sample_model = Model(reuse=False, batch_size=self.n_workers)
        self.trainer = Trainer(Model(reuse=True, batch_size=self.mini_batch_size))
        self.session: tf.Session = tf.get_default_session()

        init_op = tf.global_variables_initializer()
        self.session.run(init_op)

    def sample(self) -> (Dict[str, np.ndarray], List):
        rewards = np.zeros((self.n_workers, self.worker_steps), dtype=np.float32)
        actions = np.zeros((self.n_workers, self.worker_steps), dtype=np.int32)
        dones = np.zeros((self.n_workers, self.worker_steps), dtype=np.bool)
        obs = np.zeros((self.n_workers, self.worker_steps, 84, 84, 4), dtype=np.uint8)
        neg_log_pis = np.zeros((self.n_workers, self.worker_steps), dtype=np.float32)
        values = np.zeros((self.n_workers, self.worker_steps), dtype=np.float32)
        episode_infos = []

        for t in range(self.worker_steps):
            obs[:, t] = self.obs
            actions[:, t], values[:, t], neg_log_pis[:, t] = self.sample_model.step(self.session, self.obs)

            for w, worker in enumerate(self.workers):
                worker.child.send(("step", actions[w, t]))

            for w, worker in enumerate(self.workers):
                self.obs[w], rewards[w, t], dones[w, t], info = worker.child.recv()

                if info:
                    info['obs'] = obs[w, t, :, :, 3]
                    episode_infos.append(info)

        advantages = self._calc_advantages(dones, rewards, values)
        samples = {
            'obs': obs,
            'actions': actions,
            'values': values,
            'neg_log_pis': neg_log_pis,
            'advantages': advantages
        }

        samples_flat = {}
        for k, v in samples.items():
            samples_flat[k] = v.reshape(v.shape[0] * v.shape[1], *v.shape[2:])

        return samples_flat, episode_infos

    def _calc_advantages(self, dones: np.ndarray, rewards: np.ndarray, values: np.ndarray) -> np.ndarray:
        advantages = np.zeros((self.n_workers, self.worker_steps), dtype=np.float32)
        last_advantage = 0

        last_value = self.sample_model.get_value(self.session, self.obs)

        for t in reversed(range(self.worker_steps)):
            mask = 1.0 - dones[:, t]
            last_value = last_value * mask
            last_advantage = last_advantage * mask
            delta = rewards[:, t] + self.gamma * last_value - values[:, t]
            last_advantage = delta + self.gamma * self.lamda * last_advantage
            advantages[:, t] = last_advantage

            last_value = values[:, t]

        return advantages

    def train(self, samples: Dict[str, np.ndarray], learning_rate: float, clip_range: float):
        indexes = np.arange(self.batch_size)

        train_info = []

        for _ in range(self.epochs):
            np.random.shuffle(indexes)

            for start in range(0, self.batch_size, self.mini_batch_size):
                end = start + self.mini_batch_size
                mini_batch_indexes = indexes[start: end]
                mini_batch = {}
                for k, v in samples.items():
                    mini_batch[k] = v[mini_batch_indexes]

                res = self.trainer.train(session=self.session,
                                         learning_rate=learning_rate,
                                         clip_range=clip_range,
                                         samples=mini_batch)

                train_info.append(res)

        return np.mean(train_info, axis=0)

    def run_training_loop(self):
        writer = self._create_summary_writer()
        episode_info = deque(maxlen=100)
        best_reward = 0

        for update in range(self.updates):
            time_start = time.time()
            progress = update / self.updates

            learning_rate = 2.5e-4 * (1 - progress)
            clip_range = 0.1 * (1 - progress)

            samples, sample_episode_info = self.sample()

            train_info = self.train(samples, learning_rate, clip_range)

            time_end = time.time()
            fps = int(self.batch_size / (time_end - time_start))

            episode_info.extend(sample_episode_info)

            best_obs_frame = None
            for info in sample_episode_info:
                if info['reward'] > best_reward:
                    best_reward = info['reward']
                    best_obs_frame = info['obs']

            reward_mean, length_mean = Main._get_mean_episode_info(episode_info)

            self._write_summary(writer, best_obs_frame, update, fps,
                                reward_mean, length_mean, train_info,
                                clip_range, learning_rate)

    @staticmethod
    def _init_tf_session():
        config = tf.ConfigProto(allow_soft_placement=True,
                                log_device_placement=True)

        config.gpu_options.allow_growth = True

        tf.Session(config=config).__enter__()

        np.random.seed(7)
        tf.set_random_seed(7)

    @staticmethod
    def _get_mean_episode_info(episode_info):
        if len(episode_info) > 0:
            return (np.mean([info["reward"] for info in episode_info]),
                    np.mean([info["length"] for info in episode_info]))
        else:
            return np.nan, np.nan

    def _create_summary_writer(self) -> tf.summary.FileWriter:
        log_dir = "log/" + Path(__file__).stem
        if tf.gfile.Exists(log_dir):
            tf.gfile.DeleteRecursively(log_dir)

        return tf.summary.FileWriter(log_dir, self.session.graph)

    def _write_summary(self, writer: tf.summary.Summary,
                       best_obs_frame: Union[np.ndarray, None],
                       update: int,
                       fps: int,
                       reward_mean: int,
                       length_mean: int,
                       train_info: np.ndarray,
                       clip_range: float,
                       learning_rate: float):
        print("{:4} {:3} {:.2f} {:.3f}".format(update, fps, reward_mean, length_mean))

        summary = tf.Summary()

        if best_obs_frame is not None:
            sample_observation = best_obs_frame
            observation_png = io.BytesIO()
            pyplot.imsave(observation_png, sample_observation, format='png', cmap='gray')

            observation_png = tf.Summary.Image(encoded_image_string=observation_png.getvalue(),
                                               height=84,
                                               width=84)
            summary.value.add(tag="observation", image=observation_png)

        summary.value.add(tag="fps", simple_value=fps)
        for label, value in zip(self.trainer.train_info_labels, train_info):
            summary.value.add(tag=label, simple_value=value)
        summary.value.add(tag="reward_mean", simple_value=reward_mean)
        summary.value.add(tag="length_mean", simple_value=length_mean)
        summary.value.add(tag="clip_range", simple_value=clip_range)
        summary.value.add(tag="learning_rate", simple_value=learning_rate)

        writer.add_summary(summary, global_step=update)

    def destroy(self):
        for worker in self.workers:
            worker.child.send(("close", None))


if __name__ == "__main__":
    m = Main()
    m.run_training_loop()
    m.destroy()

`;