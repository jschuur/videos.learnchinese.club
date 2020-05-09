#!/bin/bash

ENV='production'

usage() {
  echo "Options:"
  echo "  -e export data (defaults to production)"
  echo "  -l use local environment for exports"
  echo "  -i import data to local database"
  echo "  -C use channels collection"
  echo "  -V use videos collection"
  echo "  -k JSON export in current directory when done"
  echo "  -d drop existing data before an import"
  echo "  -b back up JSON files to S3 when done"
}

while getopts “:eikdblVC” opt; do
  case $opt in
    (e) ARG_EXPORT=$'true' ;;
    (i) ARG_IMPORT='true' ;;
    (k) ARG_KEEP='true' ;;
    (d) ARG_DROP_COLLECTION='--drop' ;;
    (b) ARG_BACKUP='true' ;;
    (C) ARG_CHANNELS='true' ;;
    (V) ARG_VIDEOS='true' ;;
    (l) ENV='development' ;;

    (*)
      usage
      exit;;
  esac
  no_args=false;
done

CURRENT_TIMESTAMP=`date +%Y-%m-%d-%H%M%S`
VIDEOS_JSON="videos_${CURRENT_TIMESTAMP}_$ENV.json"
CHANNELS_JSON="channels_${CURRENT_TIMESTAMP}_$ENV.json"

if $no_args; then
  usage
  exit
fi

if [ -n "$ARG_EXPORT" ] ; then
  # Don't bother looking for an environment file in GitHub Actions
  if [ -e ".env.$ENV" ] ; then
    export $(cat .env.$ENV | xargs)
  fi

  if [ -n "$ARG_CHANNELS" ] ; then
    echo 'Exporting production channels collection'
    mongoexport --uri=$MONGODB_URL --collection channels --type JSON --out $CHANNELS_JSON
  fi
  if [ -n "$ARG_VIDEOS" ] ; then
    echo 'Exporting production videos collection'
    mongoexport --uri=$MONGODB_URL --collection videos --type JSON --out $VIDEOS_JSON
  fi
fi


if [ -n "$ARG_IMPORT" ] ; then
  if [ $ENV = 'development' ] ; then
    echo 'Skipping import, since using development environment for export too'
  else
    if [ -e .env.development ] ; then
      export $(cat .env.development | xargs)
    fi

    if [ -n "$ARG_CHANNELS" ] ; then
      echo 'Importing channels collection to local database'
      mongoimport --uri=$MONGODB_URL --collection channels $ARG_DROP_COLLECTION --mode=upsert --type JSON --file $CHANNELS_JSON
    fi
    if [ -n "$ARG_VIDEOS" ] ; then
      echo 'Importing videos collect'
      mongoimport --uri=$MONGODB_URL --collection videos $ARG_DROP_COLLECTION --mode=upsert --type JSON --file $VIDEOS_JSON
    fi
  fi
fi

if [ -n "$ARG_BACKUP" ] ; then
  echo "Copying JSON output to S3"

  if [ -n "$AWS_BACKUP_DESTINATION" ] ; then
    if [ -e $CHANNELS_JSON ] && [ -n "$ARG_CHANNELS" ] ; then
      aws s3 cp $CHANNELS_JSON $AWS_BACKUP_DESTINATION
    fi

    if [ -e $VIDEOS_JSON ] && [ -n "$ARG_VIDEOS" ] ; then
      aws s3 cp $VIDEOS_JSON $AWS_BACKUP_DESTINATION
    fi
  else
    echo "No AWS_BACKUP_DESTINATION set"
  fi
fi

if [ -z "$ARG_KEEP" ] ; then
  echo "Removing JSON export files"
  rm -f $VIDEOS_JSON
  rm -f $CHANNELS_JSON
fi