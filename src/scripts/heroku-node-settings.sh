#!/bin/bash

if [ ! "$WEB_MEMORY" = "" ]; then
  if [ $WEB_MEMORY -le 512 ]; then
    NODE_FLAGS="--max_semi_space_size=2 --max_old_space_size=256"
  elif [ $WEB_MEMORY -le 768 ]; then
    NODE_FLAGS="--max_semi_space_size=8 --max_old_space_size=512"
  elif [ $WEB_MEMORY -le 1024 ]; then
    NODE_FLAGS="--max_semi_space_size=16 --max_old_space_size=1024"
  fi
fi

echo "Starting app with command:"
echo " " node $NODE_FLAGS "$@"

if [ "$CONSUME_AND_RESTART" == "1" ]; then
  echo "Will consume build queue and relaunch automatically when it crashes..."
  while true; do
    node $NODE_FLAGS "$@" || npx babel-node ./src/consumeBuildQueue.js
  done
else
  node $NODE_FLAGS "$@"
fi
