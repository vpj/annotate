import setuptools

with open("readme.md", "r") as f:
    long_description = f.read()

setuptools.setup(
    name='annotate',
    version='1.0',
    author="Varuna Jayasiri",
    author_email="vpjayasiri@gmail.com",
    description="Annotate source code",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/vpj/annotate",
    packages=setuptools.find_packages(),
    install_requires=[],
    entry_points = {
        'console_scripts': ['annotate=annotate:start_server'],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        'Intended Audience :: Developers',
        'Intended Audience :: Science/Research',
        'Topic :: Scientific/Engineering',
        'Topic :: Scientific/Engineering :: Mathematics',
        'Topic :: Scientific/Engineering :: Artificial Intelligence',
        'Topic :: Software Development',
        'Topic :: Software Development :: Libraries',
        'Topic :: Software Development :: Libraries :: Python Modules',
    ],
    keywords='programming',
)
