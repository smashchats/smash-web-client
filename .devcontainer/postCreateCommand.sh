#!/bin/bash

# Function to print section headers
print_header() {
    echo -e "\n$1"
}

# Function to create directory if it doesn't exist
ensure_dir() {
    [ ! -d "$1" ] && mkdir -p "$1"
}

# Function to set ownership for a path
set_ownership() {
    [ -e "$1" ] && sudo chown -R node:node "$1" || echo "Warning: Could not change ownership of $1"
}

# Function to add to PATH
add_to_path() {
    grep -q "export PATH=\$PATH:$1" /home/node/.bashrc || echo "export PATH=\$PATH:$1" >> /home/node/.bashrc
    export PATH=$PATH:$1
}

# Function to install Radicle
install_radicle() {
    echo "Installing radicle..."
    curl -sSf https://radicle.xyz/install | sh
    set_ownership "/home/node/.radicle"
}

# Main script execution
main() {
    print_header "Starting post create command script..."
    echo "Dev machine:"
    uname -a

    print_header "Creating necessary directories..."
    local dirs=(
        "node_modules"
        "smash-node-lib/node_modules"
        "smash-node-lib/dist"
        "dist"
        "dev-dist"
    )
    for dir in "${dirs[@]}"; do
        ensure_dir "$dir"
    done

    print_header "Installing npm dependencies..."
    echo 'source <(npm completion)' >> /home/node/.bashrc
    npm install

    print_header "Setting permissions for mounted paths..."
    for path in "${dirs[@]}"; do
        set_ownership "$path"
    done

    print_header "Checking radicle installation..."
    add_to_path "/home/node/.radicle/bin"
    chmod -R +x /home/node/.radicle/bin

    if ! command -v rad &> /dev/null || ! rad --version &> /dev/null; then
        install_radicle
    else
        echo "Radicle is already installed"
    fi

    print_header "*******************************"
    echo "Dev container ready!"
    echo -e "*******************************\n"
}

# Run the main function
main
