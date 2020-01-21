#!/bin/bash

echo "Building server"
cd server
npm install
npm run build
cd ..

echo "Building UI"
cd ui
npm install
npm run build
cd ..

echo "Setting up shell command"
pip install -e .

echo "Run \"annotate\" from your project folder."
