#!/bin/bash

export $(cat .env.production | xargs)

if [ -z "$ENV" ] ; then
  ENV='development'
  DESTINATION_DB="-h localhost -d learnchineseclub"
else
  DESTINATION_DB="--uri $MONGODB_URL_NEW"
fi

echo "Creating new $ENV learnchineseclub database"

echo 'Exporting production channels collection'
mongoexport --uri=$MONGODB_URL --collection channels --type JSON --jsonArray | jq 'del(.[]._id)' > channels.json
echo 'Exporting production videos collection'
mongoexport --uri=$MONGODB_URL --collection videos --type JSON --jsonArray | jq 'del(.[]._id)' > videos.json

echo 'Importing channels'
mongoimport $DESTINATION_DB -c channels --type JSON --jsonArray --file channels.json --drop
echo 'Importing videos'
mongoimport $DESTINATION_DB -c videos --type JSON --jsonArray --file videos.json --drop