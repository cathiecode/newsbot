# Nikkei Bot for Misskey

## Usage
### .env
MISSKEY_SERVER=https://misskey.example.com
MISSKEY_TOKEN=tokenstring

### Run in shell
```
deno run --allow-read --allow-write --allow-env --allow-net --env newsbot.ts
```

Note that a file named `last_run` will be generated within current directory.
