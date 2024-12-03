# Shipping Game Backend

## Description
Backend for Shipping Game

## NPM Commands

### Start the server


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