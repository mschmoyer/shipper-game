# Shipping Game Backend

## Description
Backend for Shipping Game

## NPM Commands

```nvm install node```

### Start the server


## Local
```node server.js```

```node scripts/resetDatabase.js``` 

## Heroku

### Deploy commands: 

Set URL
```heroku config:set REACT_APP_HEROKU_URL=$(heroku info -s | grep web_url | cut -d= -f2)api```

Push a new container
```heroku container:push web --app shipper-game```

Release the container
```heroku container:release web --app shipper-game```

Tail the logs
```heroku logs -t```

Set an env var
```heroku config:set```

### Commands: 

Reset the database
```heroku run node scripts/resetDatabase.js```

Login to Postgres
```heroku pg:psql --app shipper-game```

### Docker 

Clean up
```docker container prune```
```docker image prune```