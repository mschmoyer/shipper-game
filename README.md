# Shipping Game Backend

## Description
Backend for Shipping Game

## NPM Commands

### Start the server


## Local

```
export POSTGRES_USER=shipper_user
export POSTGRES_PASSWORD=superHardPasswordToGuess
export POSTGRES_DB=shipper_game
export PORT=5050
export DATABASE_URL=postgres://shipper_user:superHardPasswordToGuess@localhost:5432/shipper_game
```

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

### Commands: 

Reset the database
```heroku run node scripts/resetDatabase.js```


### Docker 

Clean up
```docker container prune```
```docker image prune```
