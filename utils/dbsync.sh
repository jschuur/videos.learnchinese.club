#!/bin/bash

BACKUP_FOLDER='backups'

usage() {
  echo "Options:"
  echo "  -e export data from production"
  echo "  -i import data to local database\n"
  echo "  -C use channels collection"
  echo "  -V use videos collection\n"
  echo "  -c perform cleanup of JSON files when done"
  echo "  -d drop existing data before an import"
  echo "  -b copy JSON files to backups folder when done"
}

while getopts “:eicdbVC” opt; do
  case $opt in
    (e) ARG_EXPORT=$'true' ;;
    (i) ARG_IMPORT='true' ;;
    (c) ARG_CLEANUP='true' ;;
    (d) ARG_DROP_COLLECTION='--drop' ;;
    (b) ARG_BACKUP='true' ;;
    (C) ARG_CHANNELS='true' ;;
    (V) ARG_VIDEOS='true' ;;

    (*)
      usage
      exit;;
  esac
  no_args=false;
done

if $no_args; then
  usage
  exit
fi

if [ -n "$ARG_EXPORT" ]
then
  export $(cat .env.production | xargs)

  if [ -n "$ARG_CHANNELS" ] ; then
    echo 'Exporting production channels collection'
    mongoexport --uri=$MONGODB_URL --collection channels --type JSON --out channels.json
  fi
  if [ -n "$ARG_VIDEOS" ] ; then
    echo 'Exporting production videos collection'
    mongoexport --uri=$MONGODB_URL --collection videos --type JSON --out videos.json
  fi
fi


if [ -n "$ARG_IMPORT" ] ; then
  export $(cat .env.development | xargs)

  if [ -n "$ARG_CHANNELS" ] ; then
    echo 'Importing channels collection to local database'
    mongoimport --uri=$MONGODB_URL --collection channels $ARG_DROP_COLLECTION --mode=upsert --type JSON --file channels.json
  fi
  if [ -n "$ARG_VIDEOS" ] ; then
    echo 'Importing videos collect'
    mongoimport --uri=$MONGODB_URL --collection videos $ARG_DROP_COLLECTION --mode=upsert --type JSON --file videos.json
  fi
fi

if [ -n "$ARG_BACKUP" ] ; then
  echo "Copying JSON output to $BACKUP_FOLDER folder"

  if [ ! -d $BACKUP_FOLDER ] ; then
    echo 'Creating backup folder'
    mkdir $BACKUP_FOLDER
  fi

  if [ -e channels.json ] && [ -n "$ARG_CHANNELS" ] ; then
    cp channels.json $BACKUP_FOLDER/channels_`date +%Y-%m-%d-%H%M%S`.json
  fi
  if [ -e videos.json ] && [ -n "$ARG_VIDEOS" ] ; then
    cp videos.json $BACKUP_FOLDER/videos_`date +%Y-%m-%d-%H%M%S`.json
  fi
fi

if [ -n "$ARG_CLEANUP" ] ; then
  if [ -e videos.json ] && [ -n "$ARG_VIDEOS" ] ; then
    echo "Removing videos.json"
    rm -f videos.json
  fi

  if [ -e channels.json ] && [ -n "$ARG_CHANNELS" ] ; then
    echo "Removing channels.json"
    rm -f channels.json
  fi
fi