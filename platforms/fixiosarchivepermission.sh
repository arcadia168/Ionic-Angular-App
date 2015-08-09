#!/bin/bash

echo "Script to fix permissions error when archiving iOS build."
echo "Navigating to project folder."
yesgetinapp

cd platforms

echo "Now setting the correct permissions on the iOS platform."
sudo chown -R ***REMOVED*** ./ios

