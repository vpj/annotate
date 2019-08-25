"""
This is a standalone implementation of
 [Proximal Policy Optimization Algorithms - PPO](https://arxiv.org/abs/1707.06347).
I coded this for fun and learning.
It is based on [OpenAI Baselines](https://github.com/openai/baselines) implementation.
This was tested on [TensorFlow](https://www.tensorflow.org/) 1.7.0.
The algorithm is hard coded for *Breakout* Atari Game.

I first went through the baselines code and the papers a couple of times,
 during my free time,
 to get an overall picture of it.

Then, I started drafting the algorithm.
I referred to the paper while doing this and was taking notes.
I was coding for a single Atari game;
 so, I could ignore a lot of generalizations OpenAI Baselines had
 in order to support all Atari games (tensor dimensions, actions, observations, etc.).
I used a [Jupyter](http://jupyter.org/) notebook
 to test [OpenAI Gym](https://gym.openai.com/);
 things like what the observation space and action space were.
It took me about 2 hours to draft the code on paper.

I used [PyCharm](https://www.jetbrains.com/pycharm/) community edition to code.
I was deciding between [VSCode](https://code.visualstudio.com/) and PyCharm,
 and picked PyCharm because the code completion support was better.
I used [Python type hints](https://docs.python.org/3/library/typing.html)
 for readability and better code completion support.
Code completion is important for me,
 since I am not familiar with machine learning libraries.
I used a Jupyter notebook to test classes and functions as I was coding them.

It didn't work the first time.
There was one silly mistake in the code
 that took me about 6 hours to find;
 debugging these things is hard.

I then made a few improvements to my initial code.
The model I drafted took only one frame as input;
 then I changed it to be four frames -
 every fourth frame in a span of 16 frames.
I also ended up scaling game frames
 to match what OpenAI Baselines had done.
I initially used a fully connected network;
 then I changed it to a convolution neural network,
 with same architecture as OpenAI Baselines.

I documented it the following day, and I included notes I had on paper.
I used [pycco](https://pycco-docs.github.io/pycco/) to generate
literate-programming-style documentation.
I am a fan of literate programming.
It took me another 3 to 4 hours to document.
I did a lot of code cleanups too.
And again it took me another 2 to 3 hours to fix a bug I introduced while cleaning up.
I referred to the PPO paper and lecture notes from
 [Berkely Deep RL Course](http://rail.eecs.berkeley.edu/deeprlcourse/)
 for the math; specifically,
 [this lecture](http://rll.berkeley.edu/deeprlcourse/f17docs/lecture_13_advanced_pg.pdf).

I documented it for myself.
Then I thought of putting it online, so I improved it a bit further,
 and added a lot more comments.
The code is about 400 lines long, which is not bad.
I hope the comments make it easier to understand someone trying to read it.
I have tried to use the same notation as the PPO paper for formulas.

I experimented with some hyper parameter changes,
 but this published code is set to be similar to the
 OpenAI baselines implementation.

The implementation has four main classes.

* [Game](#game) - a wrapper for gym environment
* [Model](#model) - neural network model for policy and value function
* [Trainer](#trainer) - policy and value function updater
* [Math](#main) - runs the training loop; sampling and training

If someone reading this has any questions or comments
 please find me on Twitter,
 **[@vpj](https://twitter.com/vpj)**.
"""

# ### Imports
import io
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

# I was using a computer with two GPUs and I wanted TensorFlow to use only one of them.
import os

os.environ["CUDA_VISIBLE_DEVICES"] = "1"

class Orthogonal(object):
    """
    ## Orthogonal Initializer
    Coding this wasn't part of the plan.
    I previously used
     [TensorFlow orthogonal initializer](https://www.tensorflow.org/api_docs/python/tf/orthogonal_initializer).
    But it used a lot of GPU memory and sometimes crashed with a memory allocation error during initialization.
    I didn't test much to see what was happening;
     instead, I just copied this code from OpenAI Baselines.
    """

    def __init__(self, scale=1.):
        self.scale = scale

    def __call__(self, shape, dtype=None, partition_info=None):
        """Lasagne orthogonal initializer"""
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
    """
    ## <a name="game-environment"></a>Game environment
    This is a wrapper for OpenAI gym game environment.
    We do a few things here:

    1. Apply the same action on four frames
    2. Convert observation frames to gray and scale it to (84, 84)
    3. Take the maximum of last two of those four frames
    4. Collect four such frames for last three actions
    5. Add episode information (total reward for the entire episode) for monitoring
    6. Restrict an episode to a single life (game has 5 lives, we reset after every single life)

    #### Observation format
    Observation is tensor of size (84, 84, 4). It is four frames
    (images of the game screen) stacked on last axis.
    i.e, each channel is a frame.

        Frames    00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15
        Actions   a1 a1 a1 a1 a2 a2 a2 a2 a3 a3 a3 a3 a4 a4 a4 a4
        Max       -- -- MM MM -- -- MM MM -- -- MM MM -- -- MM MM
        Stacked   -- -- Stack -- -- Stack -- -- Stack -- -- Stack
    """

    def __init__(self, seed: int):
        """
        ### Initialize
        """

        # create environment
        self.env = gym.make('BreakoutNoFrameskip-v4')
        self.env.seed(seed)

        # buffer to take the maximum of last 2 frames for each action
        self.obs_2_max = np.zeros((2, 84, 84, 1), np.uint8)

        # tensor for a stack of 4 frames
        self.obs_4 = np.zeros((84, 84, 4))

        # keep track of the episode rewards
        self.rewards = []
        # and number of lives left
        self.lives = 0

    def step(self, action):
        """
        ### Step
        Executes `action` for 4 time steps and
         returns a tuple of (observation, reward, done, episode_info).

        * `observation`: stacked 4 frames (this frame and frames for last 3 actions) as described above
        * `reward`: total reward while the action was executed
        * `done`: whether the episode finished (a life lost)
        * `episode_info`: episode information if completed
        """

        reward = 0.
        done = None

        # run for 4 steps
        for i in range(4):
            # execute the action in the OpenAI Gym environment
            obs, r, done, info = self.env.step(action)

            # add last two frames to buffer
            if i >= 2:
                self.obs_2_max[i % 2] = self._process_obs(obs)

            reward += r

            # get number of lives left
            lives = self.env.unwrapped.ale.lives()
            # reset if a life is lost
            if lives < self.lives:
                done = True
            self.lives = lives

            # stop if episode finished
            if done:
                break

        # maintain rewards for each step
        self.rewards.append(reward)

        if done:
            # if finished, set episode information if episode is over, and reset
            episode_info = {"reward": sum(self.rewards),
                            "length": len(self.rewards)}
            self.reset()
        else:
            episode_info = None
            # get the max of last two frames
            obs = self.obs_2_max.max(axis=0)

            # push it to the stack of 4 frames
            self.obs_4 = np.roll(self.obs_4, shift=-1, axis=-1)
            self.obs_4[..., -1:] = obs

        return self.obs_4, reward, done, episode_info

    def reset(self):
        """
        ### Reset environment
        Clean up episode info and 4 frame stack
        """

        # reset OpenAI Gym environment
        obs = self.env.reset()

        # reset caches
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
        """
        #### Process game frames
        Convert game frames to gray and rescale to 84x84
        """
        obs = cv2.cvtColor(obs, cv2.COLOR_RGB2GRAY)
        obs = cv2.resize(obs, (84, 84), interpolation=cv2.INTER_AREA)
        return obs[:, :, None]  # Shape (84, 84, 1)


def worker_process(remote: multiprocessing.connection.Connection, seed: int):
    """
    ##Worker Process

    Each worker process runs this method
    """

    # create game
    game = Game(seed)

    # wait for instructions from the connection and execute them
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
    """
    ## Worker
    Creates a new worker and runs it in a separate process.
    """
    child: multiprocessing.connection.Connection
    process: multiprocessing.Process

    def __init__(self, seed):
        self.child, parent = multiprocessing.Pipe()
        self.process = multiprocessing.Process(target=worker_process, args=(parent, seed))
        self.process.start()


class Model(object):
    """
    ## <a name="model"></a>Neural Network model for policy and value function
    I initially implemented a simpler network with 2 fully connected layers,
     but later decided to implement a convolution architecture similar to
     the OpenAI baselines implementation.

    The policy network and value function share the first 4 layers.
    """

    def __init__(self, *, reuse: bool, batch_size: int):
        """
        #### Initialize
        """

        # observations input `(B, 84, 84, 4)`
        self.obs = tf.placeholder(shape=(batch_size, 84, 84, 4), name="obs", dtype=np.uint8)
        obs_float = tf.to_float(self.obs, name="obs_float")

        with tf.variable_scope("model", reuse=reuse):
            # output of the convolution network `(B, 512)`
            self.h = Model._cnn(obs_float)
            # logits for policy network $\pi_\theta$, from which the action is sampled `(B, 4)`
            self.pi_logits = Model._create_policy_network(self.h, 4)

            # value function $V(s_t)$
            self.value = Model._create_value_network(self.h)

            # all trainable variables
            self.params = tf.trainable_variables()

        # sampled action $a_t$
        self.action = Model._sample(self.pi_logits)

        # $-\log(\pi(a_t|s_t)$
        self.neg_log_pi = self.neg_log_prob(self.action, "neg_log_pi_old")

        # $ S\bigl[\pi_\theta \bigr] (s_t)$
        self.policy_entropy = Model._get_policy_entropy(self.pi_logits)

    @staticmethod
    def _get_policy_entropy(logits: tf.Tensor):
        """
        #### Policy Entropy
        $ S\bigl[\pi_\theta\\bigr] (s) = \sum_a \pi_\theta(a|s) \log \pi_\theta(a|s)$
        """

        # we subtract the logit of the best action
        #  to make the floating point calculation stable
        #  (not give infinity and nan).
        # We can do this because
        #  $\frac{e^{x_i - c}}{\sum_j e^{x_j - c}} = \frac{e^{x_i}}{\sum_j e^{x_j}}$
        #  for any constant $c$.
        a = logits - tf.reduce_max(logits, axis=-1, keepdims=True)
        exp_a = tf.exp(a)
        z = tf.reduce_sum(exp_a, axis=-1, keepdims=True)
        p = exp_a / z

        # $S = -\sum_i p  \log(p) =
        #  \sum_i p  \bigl(-\log(p) \bigr) =
        #  \sum_i p  \bigl(\log(z) - logits \bigr)$
        return tf.reduce_sum(p * (tf.log(z) - a), axis=-1)

    def neg_log_prob(self, action: tf.Tensor, name: str) -> tf.Tensor:
        """
        #### Negative log of probability of the action
        $-\log\pi(a_t|s_t) = \sum_a p(a)$

        This is equal to cross entropy with
         a probability distribution across actions, with a probability of 1 at `action`.
        $-\sum_{a'} p(a') \log \pi(a'|s_t) = -\log \pi(a_t|s_t)$ since $p(a_t) = 1$.
        """
        one_hot_actions = tf.one_hot(action, 4)
        return tf.nn.softmax_cross_entropy_with_logits_v2(
            logits=self.pi_logits,
            labels=one_hot_actions,
            dim=-1,
            name=name)

    @staticmethod
    def _sample(logits: tf.Tensor):
        """
        #### Sample from $\pi_\theta$
        Sample using
         [Gumbel-Max Trick](
         https://hips.seas.harvard.edu/blog/2013/04/06/the-gumbel-max-trick-for-discrete-distributions/).
        """
        uniform = tf.random_uniform(tf.shape(logits))
        return tf.argmax(logits - tf.log(-tf.log(uniform)),
                         axis=-1,
                         name="action")

    @staticmethod
    def _cnn(unscaled_images: tf.Tensor):
        """
        #### Convolutional Neural Network
        """

        # scale image values to [0, 1] from [0, 255]
        scaled_images = tf.cast(unscaled_images, tf.float32) / 255.

        # three convolution layers
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

        # reshape to a 2-D tensor
        nh = np.prod([v.value for v in h3.get_shape()[1:]])
        flat = tf.reshape(h3, [-1, nh])

        # fully connected layer
        h = tf.layers.dense(flat, 512,
                            activation=tf.nn.relu,
                            kernel_initializer=Orthogonal(scale=np.sqrt(2)),
                            name="hidden")

        return h

    @staticmethod
    def _create_policy_network(h: tf.Tensor, n: int) -> tf.Tensor:
        """
        #### Head for policy
        """
        return tf.layers.dense(h, n,
                               activation=None,
                               kernel_initializer=Orthogonal(scale=0.01),
                               name="logits")

    @staticmethod
    def _create_value_network(h: tf.Tensor) -> tf.Tensor:
        """
        #### Head for value function
        """
        value = tf.layers.dense(h, 1,
                                activation=None,
                                kernel_initializer=Orthogonal(),
                                name="value")
        return value[:, 0]

    def step(self, session: tf.Session, obs: np.ndarray) -> (tf.Tensor, tf.Tensor, tf.Tensor):
        """
        #### Sample actions for given observations
        """
        return session.run([self.action, self.value, self.neg_log_pi],
                           feed_dict={self.obs: obs})

    def get_value(self, session: tf.Session, obs: np.ndarray) -> tf.Tensor:
        """
        #### Get value function for a given observation
        """
        return session.run(self.value,
                           feed_dict={self.obs: obs})


class Trainer(object):
    """
    ## <a name="trainer"></a>Trainer

    We want to maximize policy reward
     $$\max_\theta J(\pi_\theta) =
       \mathop{\mathbb{E}}_{\tau \sim \pi_\theta}\Biggl[\sum_{t=0}^\infty \gamma^t r_t \Biggr]$$
     where $r$ is the reward, $\pi$ is the policy, $\tau$ is a trajectory sampled from policy,
     and $\gamma$ is the discount factor between $[0, 1]$.

    \begin{align}
    \mathbb{E}_{\tau \sim \pi_\theta} \Biggl[
     \sum_{t=0}^\infty \gamma^t A^{\pi_{OLD}}(s_t, a_t)
    \Biggr] &=
    \\
    \mathbb{E}_{\tau \sim \pi_\theta} \Biggl[
      \sum_{t=0}^\infty \gamma^t \Bigl(
       Q^{\pi_{OLD}}(s_t, a_t) - V^{\pi_{OLD}}(s_t)
      \Bigr)
     \Biggr] &=
    \\
    \mathbb{E}_{\tau \sim \pi_\theta} \Biggl[
      \sum_{t=0}^\infty \gamma^t \Bigl(
       Q^{\pi_{OLD}}(s_t, a_t) - V^{\pi_{OLD}}(s_t)
      \Bigr)
     \Biggr] &=
    \\
    \mathbb{E}_{\tau \sim \pi_\theta} \Biggl[
      \sum_{t=0}^\infty \gamma^t \Bigl(
       r_t + V^{\pi_{OLD}}(s_{t+1}) - V^{\pi_{OLD}}(s_t)
      \Bigr)
     \Biggr] &=
    \\
    \mathbb{E}_{\tau \sim \pi_\theta} \Biggl[
      \sum_{t=0}^\infty \gamma^t \Bigl(
       r_t
      \Bigr)
     \Biggr]
     - \mathbb{E}_{\tau \sim \pi_\theta}
        \Biggl[V^{\pi_{OLD}}(s_0)\Biggr] &=
    J(\pi_\theta) - J(\pi_{\theta_{OLD}})
    \end{align}

    So,
     $$\max_\theta J(\pi_\theta) =
       \max_\theta \mathbb{E}_{\tau \sim \pi_\theta} \Biggl[
          \sum_{t=0}^\infty \gamma^t A^{\pi_{OLD}}(s_t, a_t)
       \Biggr]$$

    Define discounted-future state distribution,
     $$d^\pi(s) = (1 - \gamma) \sum_{t=0}^\infty \gamma^t P(s_t = s | \pi)$$

    Then,
    \begin{align}
    J(\pi_\theta) - J(\pi_{\theta_{OLD}})
    &= \mathbb{E}_{\tau \sim \pi_\theta} \Biggl[
     \sum_{t=0}^\infty \gamma^t A^{\pi_{OLD}}(s_t, a_t)
    \Biggr]
    \\
    &= \frac{1}{1 - \gamma}
     \mathbb{E}_{s \sim d^{\pi_\theta}, a \sim \pi_\theta} \Bigl[
      A^{\pi_{OLD}}(s, a)
     \Bigr]
    \end{align}

    Importance sampling $a$ from $\pi_{\theta_{OLD}}$,

    \begin{align}
    J(\pi_\theta) - J(\pi_{\theta_{OLD}})
    &= \frac{1}{1 - \gamma}
     \mathbb{E}_{s \sim d^{\pi_\theta}, a \sim \pi_\theta} \Bigl[
      A^{\pi_{OLD}}(s, a)
     \Bigr]
    \\
    &= \frac{1}{1 - \gamma}
     \mathbb{E}_{s \sim d^{\pi_\theta}, a \sim \pi_{\theta_{OLD}}} \Biggl[
      \frac{\pi_\theta(a|s)}{\pi_{\theta_{OLD}}(a|s)} A^{\pi_{OLD}}(s, a)
     \Biggr]
    \end{align}

    Then we assume $d^\pi_\theta(s)$ and  $d^\pi_{\theta_{OLD}}(s)$ are similar.
    The error we introduce to $J(\pi_\theta) - J(\pi_{\theta_{OLD}})$
     by this assumtion is bound by the KL divergence between
     $\pi_\theta$ and $\pi_{\theta_{OLD}}$.
    [Constrained Policy Optimization](https://arxiv.org/abs/1705.10528)
     shows the proof of this. I haven't read it.


    \begin{align}
    J(\pi_\theta) - J(\pi_{\theta_{OLD}})
    &= \frac{1}{1 - \gamma}
     \mathop{\mathbb{E}}_{s \sim d^{\pi_\theta} \atop a \sim \pi_{\theta_{OLD}}} \Biggl[
      \frac{\pi_\theta(a|s)}{\pi_{\theta_{OLD}}(a|s)} A^{\pi_{OLD}}(s, a)
     \Biggr]
    \\
    &\approx \frac{1}{1 - \gamma}
     \mathop{\mathbb{E}}_{\color{orange}{s \sim d^{\pi_{\theta_{OLD}}}} \atop a \sim \pi_{\theta_{OLD}}} \Biggl[
      \frac{\pi_\theta(a|s)}{\pi_{\theta_{OLD}}(a|s)} A^{\pi_{OLD}}(s, a)
     \Biggr]
    \\
    &= \frac{1}{1 - \gamma} \mathcal{L}^{CPI}
    \end{align}
    """

    def __init__(self, model: Model):
        """
        ### Initialization
        """

        # model for training, $\pi_\theta$ and $V_\theta$.
        # This model shares parameters with the sampling model so,
        #  updating variables affect both.
        self.model = model

        # sampled observations are fed into the model to get $\pi_\theta(a_t|s_t)$;
        #  we are treating observations as state
        self.sampled_obs = self.model.obs

        # $a_t$ actions sampled from $\pi_{\theta_{OLD}}$
        self.sampled_action = tf.placeholder(dtype=tf.int32, shape=[None], name="sampled_action")
        # $R_t$ returns sampled from $\pi_{\theta_{OLD}}$
        self.sampled_return = tf.placeholder(dtype=tf.float32, shape=[None], name="sampled_return")

        # $\bar{A_t} = \frac{\hat{A_t} - \mu(\hat{A_t})}{\sigma(\hat{A_t})}$,
        # where $\hat{A_t}$ is advantages sampled from $\pi_{\theta_{OLD}}$.
        # Refer to sampling function in [Main class](#main) below
        #  for the calculation of $\hat{A}_t$.
        self.sampled_normalized_advantage = tf.placeholder(dtype=tf.float32, shape=[None],
                                                           name="sampled_normalized_advantage")

        # $-\log \pi_{\theta_{OLD}} (a_t|s_t)$ log probabilities
        self.sampled_neg_log_pi = tf.placeholder(dtype=tf.float32, shape=[None], name="sampled_neg_log_pi")
        # $\hat{V_t}$ value estimates
        self.sampled_value = tf.placeholder(dtype=tf.float32, shape=[None], name="sampled_value")

        # learning rate
        self.learning_rate = tf.placeholder(dtype=tf.float32, shape=[], name="learning_rate")

        # $\epsilon$ for clipping
        self.clip_range = tf.placeholder(dtype=tf.float32, shape=[], name="clip_range")

        # #### Policy

        # $-\log \pi_\theta (a_t|s_t)$
        neg_log_pi = self.model.neg_log_prob(self.sampled_action, "neg_log_pi")

        # ratio $r_t(\theta) = \frac{\pi_\theta (a_t|s_t)}{\pi_{\theta_{OLD}} (a_t|s_t)}$;
        # *this is different from rewards* $r_t$.
        ratio = tf.exp(self.sampled_neg_log_pi - neg_log_pi, name="ratio")

        # \begin{align}
        # \mathcal{L}^{CLIP}(\theta) =
        #  \mathbb{E}_{a_t, s_t \sim \pi_{\theta{OLD}}} \biggl[
        #    min \Bigl(r_t(\theta) \bar{A_t},
        #              clip \bigl(
        #               r_t(\theta), 1 - \epsilon, 1 + \epsilon
        #              \bigr) \bar{A_t}
        #    \Bigr)
        #  \biggr]
        # \end{align}
        #
        # The ratio is clipped to be close to 1.
        # We take the minimum so that the gradient will only pull
        # $\pi_\theta$ towards $\pi_{\theta_{OLD}}$ if the ratio is
        # not between $1 - \epsilon$ and $1 + \epsilon$.
        # This keeps the KL divergence between $\pi_\theta$
        #  and $\pi_{\theta_{OLD}}$ constrained.
        # Large deviation can cause performance collapse;
        #  where the policy performance drops and doesn't recover because
        #  we are sampling from a bad policy.
        #
        # Using the normalized advantage
        #  $\bar{A_t} = \frac{\hat{A_t} - \mu(\hat{A_t})}{\sigma(\hat{A_t})}$
        #  introduces a bias to the policy gradient estimator,
        #  but it reduces variance a lot.
        clipped_ratio = tf.clip_by_value(ratio, 1.0 - self.clip_range, 1.0 + self.clip_range, name="clipped_ratio")
        self.policy_reward = tf.reduce_mean(tf.minimum(ratio * self.sampled_normalized_advantage,
                                                       clipped_ratio * self.sampled_normalized_advantage),
                                            name="policy_reward")

        # #### Entropy Bonus

        # $\mathcal{L}^{EB}(\theta) =
        #  \mathbb{E}\Bigl[ S\bigl[\pi_\theta\bigr] (s_t) \Bigr]$
        self.entropy_bonus = tf.reduce_mean(self.model.policy_entropy, name="entropy_bonus")

        # #### Value

        # $V^{\pi_\theta}(s_t)$
        value = self.model.value

        # \begin{align}
        # V^{\pi_\theta}_{CLIP}(s_t)
        #  &= clip\Bigl(V^{\pi_\theta}(s_t) - \hat{V_t}, -\epsilon, +\epsilon\Bigr)
        # \\
        # \mathcal{L}^{VF}(\theta)
        #  &= \frac{1}{2} \mathbb{E} \biggl[
        #   max\Bigl(\bigl(V^{\pi_\theta}(s_t) - R_t\bigr)^2,
        #       \bigl(V^{\pi_\theta}_{CLIP}(s_t) - R_t\bigr)^2\Bigr)
        #  \biggr]
        # \end{align}
        #
        # Clipping makes sure the value function $V_\theta$ doesn't deviate
        #  significantly from $V_{\theta_{OLD}}$.
        clipped_value = tf.add(self.sampled_value,
                               tf.clip_by_value(value - self.sampled_value, -self.clip_range, self.clip_range),
                               name="clipped_value")
        self.vf_loss = tf.multiply(0.5,
                                   tf.reduce_mean(tf.maximum(tf.square(value - self.sampled_return),
                                                             tf.square(clipped_value - self.sampled_return))),
                                   name="vf_loss")

        # $\mathcal{L}^{CLIP+VF+EB} (\theta) =
        #  \mathcal{L}^{CLIP} (\theta) - c_1 \mathcal{L}^{VF} (\theta) + c_2 \mathcal{L}^{EB}(\theta)$

        # we want to maximize $\mathcal{L}^{CLIP+VF+EB}(\theta)$ so we take the negative of it as the loss
        self.loss = -(self.policy_reward - 0.5 * self.vf_loss + 0.01 * self.entropy_bonus)

        # compute gradients
        params = self.model.params
        grads, _ = tf.clip_by_global_norm(tf.gradients(self.loss, params), 0.5)

        # *Adam* optimizer
        adam = tf.train.AdamOptimizer(learning_rate=self.learning_rate, epsilon=1e-5)
        grads_and_vars = list(zip(grads, params))
        self.train_op = adam.apply_gradients(grads_and_vars, name="apply_gradients")

        # for monitoring
        self.approx_kl_divergence = .5 * tf.reduce_mean(tf.square(neg_log_pi - self.sampled_neg_log_pi))
        self.clip_fraction = tf.reduce_mean(tf.to_float(tf.greater(tf.abs(ratio - 1.0), self.clip_range)))

        # labels training progress indicators for monitoring
        self.train_info_labels = ['policy_reward',
                                  'value_loss',
                                  'entropy_bonus',
                                  'approx_kl_divergence',
                                  'clip_fraction']

    def train(self, session: tf.Session, samples: Dict[str, np.ndarray], learning_rate: float, clip_range: float):
        """
        ### Train model with samples
        """
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

        # return all results except `train_op`
        return session.run(evals, feed_dict=feed_dict)[:-1]

    @staticmethod
    def _normalize(adv: np.ndarray):
        """#### Normalize advantage function"""
        return (adv - adv.mean()) / (adv.std() + 1e-8)


class Main(object):
    """
    ## <a name="main"></a>Main class
    This class runs the training loop.
    It initializes TensorFlow, handles logging and monitoring,
     and runs workers as multiple processes.
    """

    def __init__(self):
        """
        ### Initialize
        """

        # #### Configurations

        # $\gamma$ and $\lambda$ for advantage calculation
        self.gamma = 0.99
        self.lamda = 0.95

        # number of updates
        self.updates = 10000

        # number of epochs to train the model with sampled data
        self.epochs = 4
        # number of worker processes
        self.n_workers = 8
        # number of steps to run on each process for a single update
        self.worker_steps = 128
        # number of mini batches
        self.n_mini_batch = 4
        # total number of samples for a single update
        self.batch_size = self.n_workers * self.worker_steps
        # size of a mini batch
        self.mini_batch_size = self.batch_size // self.n_mini_batch
        assert (self.batch_size % self.n_mini_batch == 0)

        # #### Initialize

        # initialize TensorFlow session
        Main._init_tf_session()

        # create workers
        self.workers = [Worker(47 + i) for i in range(self.n_workers)]

        # initialize tensors for observations
        self.obs = np.zeros((self.n_workers, 84, 84, 4), dtype=np.uint8)
        for worker in self.workers:
            worker.child.send(("reset", None))
        for i, worker in enumerate(self.workers):
            self.obs[i] = worker.child.recv()

        # model for sampling
        self.sample_model = Model(reuse=False, batch_size=self.n_workers)
        # trainer
        self.trainer = Trainer(Model(reuse=True, batch_size=self.mini_batch_size))

        # We create two models because the batch sizes are different,
        #  but they both share the same parameters.

        # create TensorFlow session
        self.session: tf.Session = tf.get_default_session()

        # initialize TensorFlow variables
        init_op = tf.global_variables_initializer()
        self.session.run(init_op)

    def sample(self) -> (Dict[str, np.ndarray], List):
        """### Sample data with current policy"""

        rewards = np.zeros((self.n_workers, self.worker_steps), dtype=np.float32)
        actions = np.zeros((self.n_workers, self.worker_steps), dtype=np.int32)
        dones = np.zeros((self.n_workers, self.worker_steps), dtype=np.bool)
        obs = np.zeros((self.n_workers, self.worker_steps, 84, 84, 4), dtype=np.uint8)
        neg_log_pis = np.zeros((self.n_workers, self.worker_steps), dtype=np.float32)
        values = np.zeros((self.n_workers, self.worker_steps), dtype=np.float32)
        episode_infos = []

        # sample `worker_steps` from each worker
        for t in range(self.worker_steps):
            # `self.obs` keeps track of the last observation from each worker,
            #  which is the input for the model to sample the next action
            obs[:, t] = self.obs
            # sample actions from $\pi_{\theta_{OLD}}$ for each worker;
            #  this returns arrays of size `n_workers`
            actions[:, t], values[:, t], neg_log_pis[:, t] = self.sample_model.step(self.session, self.obs)

            # run sampled actions on each worker
            for w, worker in enumerate(self.workers):
                worker.child.send(("step", actions[w, t]))

            for w, worker in enumerate(self.workers):
                # get results after executing the actions
                self.obs[w], rewards[w, t], dones[w, t], info = worker.child.recv()

                # collect episode info, which is available if an episode finished;
                #  this includes total reward and length of the episode -
                #  look at `Game` to see how it works.
                # We also add a game frame to it for monitoring.
                if info:
                    info['obs'] = obs[w, t, :, :, 3]
                    episode_infos.append(info)

        # calculate advantages
        advantages = self._calc_advantages(dones, rewards, values)
        samples = {
            'obs': obs,
            'actions': actions,
            'values': values,
            'neg_log_pis': neg_log_pis,
            'advantages': advantages
        }

        # samples are currently in [workers, time] table,
        #  we should flatten it
        samples_flat = {}
        for k, v in samples.items():
            samples_flat[k] = v.reshape(v.shape[0] * v.shape[1], *v.shape[2:])

        return samples_flat, episode_infos

    def _calc_advantages(self, dones: np.ndarray, rewards: np.ndarray, values: np.ndarray) -> np.ndarray:
        """
        ### Calculate advantages
        \begin{align}
        \hat{A_t^{(1)}} &= r_t + \gamma V(s_{t+1}) - V(s)
        \\
        \hat{A_t^{(2)}} &= r_t + \gamma r_{t+1} +\gamma^2 V(s_{t+2}) - V(s)
        \\
        ...
        \\
        \hat{A_t^{(\infty)}} &= r_t + \gamma r_{t+1} +\gamma^2 r_{t+1} + ... - V(s)
        \end{align}

        $\hat{A_t^{(1)}}$ is high bias, low variance whilst
        $\hat{A_t^{(\infty)}}$ is unbiased, high variance.

        We take a weighted average of $\hat{A_t^{(k)}}$ to balance bias and variance.
        This is called Generalized Advantage Estimation.
        $$\hat{A_t} = \hat{A_t^{GAE}} = \sum_k w_k \hat{A_t^{(k)}}$$
        We set $w_k = \lambda^{k-1}$, this gives clean calculation for
        $\hat{A_t}$

        \begin{align}
        \delta_t &= r_t + \gamma V(s_{t+1}) - V(s_t)$
        \\
        \hat{A_t} &= \delta_t + \gamma \lambda \delta_{t+1} + ... +
                             (\gamma \lambda)^{T - t + 1} \delta_{T - 1}$
        \\
        &= \delta_t + \gamma \lambda \hat{A_{t+1}}
        \end{align}
        """

        # advantages table
        advantages = np.zeros((self.n_workers, self.worker_steps), dtype=np.float32)
        last_advantage = 0

        # $V(s_{t+1})$
        last_value = self.sample_model.get_value(self.session, self.obs)

        for t in reversed(range(self.worker_steps)):
            # mask if episode completed after step $t$
            mask = 1.0 - dones[:, t]
            last_value = last_value * mask
            last_advantage = last_advantage * mask
            # $\delta_t$
            delta = rewards[:, t] + self.gamma * last_value - values[:, t]

            # $\hat{A_t} = \delta_t + \gamma \lambda \hat{A_{t+1}}$
            last_advantage = delta + self.gamma * self.lamda * last_advantage

            # note that we are collecting in reverse order.
            # *My initial code was appending to a list and
            #   I forgot to reverse it later.
            # It took me around 4 to 5 hours to find the bug.
            # The performance of the model was improving
            #  slightly during initial runs,
            #  probably because the samples are similar.*
            advantages[:, t] = last_advantage

            last_value = values[:, t]

        return advantages

    def train(self, samples: Dict[str, np.ndarray], learning_rate: float, clip_range: float):
        """
        ### Train the model based on samples
        """

        # `[0, 1, ...,B]
        indexes = np.arange(self.batch_size)

        # collect training information like losses for monitoring
        train_info = []

        # It learns faster with a higher number of epochs,
        #  but becomes a little unstable; that is,
        #  the average episode reward does not monotonically increase
        #  over time.
        # May be reducing the clipping range might solve it.
        for _ in range(self.epochs):
            # shuffle for each epoch
            np.random.shuffle(indexes)

            # for each mini batch
            for start in range(0, self.batch_size, self.mini_batch_size):
                # get mini batch
                end = start + self.mini_batch_size
                mini_batch_indexes = indexes[start: end]
                mini_batch = {}
                for k, v in samples.items():
                    mini_batch[k] = v[mini_batch_indexes]

                # train
                res = self.trainer.train(session=self.session,
                                         learning_rate=learning_rate,
                                         clip_range=clip_range,
                                         samples=mini_batch)

                # append to training information
                train_info.append(res)

        # return average of training information
        return np.mean(train_info, axis=0)

    def run_training_loop(self):
        """
        ### Run training loop
        """

        # summary writer for TensorBoard
        writer = self._create_summary_writer()

        # last 100 episode information
        episode_info = deque(maxlen=100)
        # highest episode reward
        best_reward = 0

        for update in range(self.updates):
            time_start = time.time()
            progress = update / self.updates

            # decreasing `learning_rate` and `clip_range` $\epsilon$
            learning_rate = 2.5e-4 * (1 - progress)
            clip_range = 0.1 * (1 - progress)

            # sample with current policy
            samples, sample_episode_info = self.sample()

            # train the model
            train_info = self.train(samples, learning_rate, clip_range)

            time_end = time.time()
            # frame rate
            fps = int(self.batch_size / (time_end - time_start))

            # collect episode info
            episode_info.extend(sample_episode_info)

            # is there a frame of an episode better than current best
            best_obs_frame = None
            for info in sample_episode_info:
                if info['reward'] > best_reward:
                    best_reward = info['reward']
                    best_obs_frame = info['obs']

            # mean of last 100 episodes
            reward_mean, length_mean = Main._get_mean_episode_info(episode_info)

            # write summary info to the writer, and log to the screen
            self._write_summary(writer, best_obs_frame, update, fps,
                                reward_mean, length_mean, train_info,
                                clip_range, learning_rate)

    @staticmethod
    def _init_tf_session():
        """
        #### Initialize TensorFlow session
        """

        # let TensorFlow decide where to run operations;
        #  I think it chooses the GPU for everything if you have one
        config = tf.ConfigProto(allow_soft_placement=True,
                                log_device_placement=True)

        # grow GPU memory as needed
        config.gpu_options.allow_growth = True

        tf.Session(config=config).__enter__()

        # set random seeds,
        #  but it doesn't seem to produce identical results.
        #
        # One explanation is that there would be floating point errors that get accumulated.
        # But that is not possible, because, as far as I know, floating point calculations
        #  are deterministic even if they could be unpredictable (in small scale).
        # However, there may be certain hardware optimizations that cause them to be random.
        np.random.seed(7)
        tf.set_random_seed(7)

    @staticmethod
    def _get_mean_episode_info(episode_info):
        """
        #### Get average episode reward and episode length
        """
        if len(episode_info) > 0:
            return (np.mean([info["reward"] for info in episode_info]),
                    np.mean([info["length"] for info in episode_info]))
        else:
            return np.nan, np.nan

    def _create_summary_writer(self) -> tf.summary.FileWriter:
        """
        #### Create summary writer
        I used TensorBoard for monitoring.
        I made copies of programs when I was making changes,
         and logged them to different directories so that I can later see
         how each version worked.
        """
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
        """
        #### Write summary
        """

        print("{:4} {:3} {:.2f} {:.3f}".format(update, fps, reward_mean, length_mean))

        summary = tf.Summary()

        # add an image
        if best_obs_frame is not None:
            sample_observation = best_obs_frame
            observation_png = io.BytesIO()
            pyplot.imsave(observation_png, sample_observation, format='png', cmap='gray')

            observation_png = tf.Summary.Image(encoded_image_string=observation_png.getvalue(),
                                               height=84,
                                               width=84)
            summary.value.add(tag="observation", image=observation_png)

        # add scalars
        summary.value.add(tag="fps", simple_value=fps)
        for label, value in zip(self.trainer.train_info_labels, train_info):
            summary.value.add(tag=label, simple_value=value)
        summary.value.add(tag="reward_mean", simple_value=reward_mean)
        summary.value.add(tag="length_mean", simple_value=length_mean)
        summary.value.add(tag="clip_range", simple_value=clip_range)
        summary.value.add(tag="learning_rate", simple_value=learning_rate)

        # write to file
        writer.add_summary(summary, global_step=update)

    def destroy(self):
        """
        ### Destroy
        Stop the workers
        """
        for worker in self.workers:
            worker.child.send(("close", None))


# ## Run it
if __name__ == "__main__":
    m = Main()
    m.run_training_loop()
    m.destroy()
