#!/bin/bash

if [ ! "$WEB_MEMORY" = "" ]; then
  if [ $WEB_MEMORY -le 512 ]; then
    NODE_FLAGS="--max-semi-space-size=2 --max-old-space-size=256"
  elif [ $WEB_MEMORY -le 768 ]; then
    NODE_FLAGS="--max-semi-space-size=8 --max-old-space-size=512"
  elif [ $WEB_MEMORY -le 1024 ]; then
    NODE_FLAGS="--max-semi-space-size=16 --max-old-space-size=1024"
  fi
fi

echo "Starting app with command:"
echo " " node $NODE_FLAGS "$@"
node $NODE_FLAGS "$@"
