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
  echo "  -b move JSON files to backups folder when done"
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
    mongoexport --host Cluster0-shard-0/cluster0-shard-00-00-lokbd.mongodb.net:27017,cluster0-shard-00-01-lokbd.mongodb.net:27017,cluster0-shard-00-02-lokbd.mongodb.net:27017 --ssl --username $MONGODB_USER --password $MONGODB_PASSWORD --authenticationDatabase admin --db $MONGODB_DATABASE --collection channels --type JSON --out channels.json
  fi
  if [ -n "$ARG_VIDEOS" ] ; then
    echo 'Exporting production videos collection'
    mongoexport --host Cluster0-shard-0/cluster0-shard-00-00-lokbd.mongodb.net:27017,cluster0-shard-00-01-lokbd.mongodb.net:27017,cluster0-shard-00-02-lokbd.mongodb.net:27017 --ssl --username $MONGODB_USER --password $MONGODB_PASSWORD --authenticationDatabase admin --db $MONGODB_DATABASE --collection videos --type JSON --out videos.json
  fi
fi


if [ -n "$ARG_IMPORT" ] ; then
  export $(cat .env.development | xargs)

  if [ -n "$ARG_CHANNELS" ] ; then
    echo 'Importing channels collection to local database'
    mongoimport --host localhost --db $MONGODB_DATABASE --collection channels $ARG_DROP_COLLECTION --type JSON --file channels.json
  fi
  if [ -n "$ARG_VIDEOS" ] ; then
    echo 'Importing videos collection to local database'
    mongoimport --host localhost --db $MONGODB_DATABASE --collection videos $ARG_DROP_COLLECTION --type JSON --file videos.json
  fi
fi

if [ -n "$ARG_BACKUP" ] ; then
  echo 'Moving JSON dumps to backup folder'

  if [ ! -d $BACKUP_FOLDER ] ; then
    echo 'Creating backup folder'
    mkdir $BACKUP_FOLDER
  fi

  if [ -e channels.json ] && [ -n "$ARG_CHANNELS" ] ; then
    cp channels.json $BACKUP_FOLDER
  fi
  if [ -e videos.json ] && [ -n "$ARG_VIDEOS" ] ; then
    cp videos.json $BACKUP_FOLDER
  fi
fi

if [ -n "$ARG_CLEANUP" ] ; then
  echo 'Doing cleanup'
  # rm -f channels.json videos.json
fi
