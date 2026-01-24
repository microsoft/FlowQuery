# FlowQuery Python Environment Setup Script for Windows (PowerShell)
# This script creates a conda environment for FlowQuery development

Write-Host "========================================"
Write-Host "FlowQuery Python Environment Setup"
Write-Host "========================================"
Write-Host ""

# Check if conda is available
$condaPath = Get-Command conda -ErrorAction SilentlyContinue
if (-not $condaPath) {
    Write-Host "ERROR: Conda is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Anaconda or Miniconda first."
    exit 1
}

# Set environment name
$envName = "flowquery"

# Get Python version from pyproject.toml
$pyprojectContent = Get-Content "pyproject.toml" -Raw
if ($pyprojectContent -match 'requires-python\s*=\s*">=([0-9.]+)"') {
    $pythonVersion = $matches[1]
} else {
    $pythonVersion = "3.10"  # fallback
}
Write-Host "Using Python version: $pythonVersion"

# Check if environment already exists
$envList = conda env list
if ($envList -match "^$envName\s") {
    Write-Host "Environment '$envName' already exists."
    $recreate = Read-Host "Do you want to recreate it? (y/n)"
    if ($recreate -eq "y" -or $recreate -eq "Y") {
        Write-Host "Removing existing environment..."
        conda env remove -n $envName -y
    } else {
        Write-Host "Keeping existing environment..."
        Write-Host ""
        Write-Host "========================================"
        Write-Host "Environment ready!"
        Write-Host "========================================"
        Write-Host ""
        Write-Host "To activate the environment, run:"
        Write-Host "    conda activate $envName" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "To run tests:"
        Write-Host "    pytest tests/" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "To deactivate when done:"
        Write-Host "    conda deactivate" -ForegroundColor Cyan
        exit 0
    }
}

# Create the environment
Write-Host ""
Write-Host "Creating conda environment '$envName' with Python $pythonVersion..."
conda create -n $envName python=$pythonVersion pip -y

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Failed to create conda environment." -ForegroundColor Red
    exit 1
}

# Activate and install package in dev mode
Write-Host ""
Write-Host "Installing package in development mode..."
conda activate $envName
pip install -e ".[dev]"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Failed to install package." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================"
Write-Host "Environment created successfully!" -ForegroundColor Green
Write-Host "========================================"
Write-Host ""
Write-Host "To activate the environment, run:"
Write-Host "    conda activate $envName" -ForegroundColor Cyan
Write-Host ""
Write-Host "To run tests:"
Write-Host "    pytest tests/" -ForegroundColor Cyan
Write-Host ""
Write-Host "To deactivate when done:"
Write-Host "    conda deactivate" -ForegroundColor Cyan
Write-Host ""
