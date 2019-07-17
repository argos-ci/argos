#!/bin/bash

if [ ! "$WEB_MEMORY" = "" ]; then
  if [ $WEB_MEMORY -le 512 ]; then
    NODE_FLAGS="--optimize-for-size --max-old-space-size=460"
  elif [ $WEB_MEMORY -le 768 ]; then
    NODE_FLAGS="--optimize-for-size --max-old-space-size=690"
  elif [ $WEB_MEMORY -le 1024 ]; then
    NODE_FLAGS="--optimize-for-size --max-old-space-size=920"
  fi
fi

echo "Starting app with command:"
echo " " node $NODE_FLAGS "$@"
node $NODE_FLAGS "$@"
