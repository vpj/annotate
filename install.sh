#!/bin/bash

echo "Building Annotate"
npm install
npm run build

echo "Setting up shell command"
pip install -e .

echo "Run \"annotate\" from your project folder."
