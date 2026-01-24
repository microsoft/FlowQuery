#!/bin/bash
# FlowQuery Python Environment Setup Script for Linux/macOS
# This script creates a conda environment for FlowQuery development

echo "========================================"
echo "FlowQuery Python Environment Setup"
echo "========================================"
echo

# Check if conda is available
if ! command -v conda &> /dev/null; then
    echo "ERROR: Conda is not installed or not in PATH."
    echo "Please install Anaconda or Miniconda first."
    exit 1
fi

# Set environment name
ENV_NAME="flowquery"

# Get Python version from pyproject.toml
PYTHON_VERSION=$(grep -oP 'requires-python\s*=\s*">=\K[0-9.]+' pyproject.toml 2>/dev/null || echo "3.10")
echo "Using Python version: $PYTHON_VERSION"

# Check if environment already exists
if conda env list | grep -q "^${ENV_NAME} "; then
    echo "Environment '${ENV_NAME}' already exists."
    read -p "Do you want to recreate it? (y/n): " RECREATE
    if [[ "$RECREATE" =~ ^[Yy]$ ]]; then
        echo "Removing existing environment..."
        conda env remove -n "$ENV_NAME" -y
    else
        echo "Keeping existing environment..."
        echo
        echo "========================================"
        echo "Environment ready!"
        echo "========================================"
        echo
        echo "To activate the environment, run:"
        echo "    conda activate $ENV_NAME"
        echo
        echo "To run tests:"
        echo "    pytest tests/"
        echo
        echo "To deactivate when done:"
        echo "    conda deactivate"
        exit 0
    fi
fi

# Create the environment
echo
echo "Creating conda environment '${ENV_NAME}' with Python ${PYTHON_VERSION}..."
conda create -n "$ENV_NAME" python="$PYTHON_VERSION" pip -y

if [ $? -ne 0 ]; then
    echo
    echo "ERROR: Failed to create conda environment."
    exit 1
fi

# Activate and install package in dev mode
echo
echo "Installing package in development mode..."
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate "$ENV_NAME"
pip install -e ".[dev]"

if [ $? -ne 0 ]; then
    echo
    echo "ERROR: Failed to install package."
    exit 1
fi

echo
echo "========================================"
echo "Environment created successfully!"
echo "========================================"
echo
echo "To activate the environment, run:"
echo "    conda activate $ENV_NAME"
echo
echo "To run tests:"
echo "    pytest tests/"
echo
echo "To deactivate when done:"
echo "    conda deactivate"
echo
