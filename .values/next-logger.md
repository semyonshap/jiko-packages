Directory structure:
└── sainsburys-tech-next-logger/
├── README.md
├── lib/
│ ├── defaultPinoConfig.js
│ ├── logger.js
│ └── patches/
│ ├── console.js
│ └── next.js
└── presets/
├── all.js
└── next-only.js

Files Content:

================================================
FILE: README.md
================================================

# next-logger

JSON logging patcher for Next.js

## Description

This is a library to patch the logging functions used by [Next.js](https://nextjs.org/), to have them output to `stdout` as newline-delimited JSON. This allows a Next.js application to log service events in a format that's compatible with log aggregators, without needing a custom Next.js server.

This works by importing Next.js' inbuilt [logger](https://github.com/vercel/next.js/blob/canary/packages/next/build/output/log.ts) via `require`, and replacing the logging methods with custom ones. It uses [`pino`](https://github.com/pinojs/pino) to output JSON formatted logs, preserving Next.js' message and prefix, but adding timestamp, hostname and more. Although the library was mainly developed based on `pino`, it also supports [`winston`](https://github.com/winstonjs/winston) as the logger backend. See the [Custom Logger](#custom-logger) section below for more details.

From v2.0.0 onwards, this library also patches the global `console` methods, to catch additional logs that Next.js makes directly to `console`. While `pino` logging remains intact, this may cause issues with other libraries which patch or use `console` methods. Use the `next-only` preset to opt-out of this patching.

## Example Logs

Before:

```sh
ready - started server on http://localhost:3000
info  - Using external babel configuration from .babelrc
event - compiled successfully
```

After:

```json
{"level":30,"time":1609160882850,"pid":18493,"hostname":"MyHostname","name":"next.js","msg":"started server on http://localhost:3000","prefix":"ready"}
{"level":30,"time":1609160883607,"pid":18493,"hostname":"MyHostname","name":"next.js","msg":"Using external babel configuration from .babelrc","prefix":"info"}
{"level":30,"time":1609160885675,"pid":18493,"hostname":"MyHostname","name":"next.js","msg":"compiled successfully","prefix":"event"}
```

## Usage

First, install this package and `pino`. You can do this with whatever Node package manager you're using in your project.

```sh
npm install next-logger pino

# or for Yarn

yarn add next-logger pino
```

Then use the Next [Instrumentation](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation) hook to load this library.

- Create `instrumentation.ts|js` file in the root directory of your project (or inside the src folder if using one)
  ```js
  export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      await require('pino')
      await require('next-logger')
    }
  }
  ```
- Enable the instrumentation hook in `next.config.js`
  ```js
  const nextConfig = {
    // [...]
    experimental: {
      instrumentationHook: true,
    },
  }
  ```

### Presets

To support opting out of some patches, this library supports "presets". These can be used as above, with `/presets/<PRESET_NAME>` appended, for example: `await require("next-logger/presets/next-only")`.

The following presets are supported:

- `next-logger/presets/all` - this includes all the patches this library supports. Using the library without a preset specified will use this preset.
- `next-logger/presets/next-only` - this only includes patches specifically for the Next.js logger object.

### Custom Logger

By default, this library uses an instance of Pino with a modified [`logMethod`](https://getpino.io/#/docs/api?id=logmethod), to give reasonable out-the-box behaviour for JSON logging. If you need logs in a different format, for example to change the message field or transform logged objects, you can provide your own instance of Pino to the library.

This is done by creating a `next-logger.config.js` file in the root of your project. The file should be a CommonJS module, and a function returning your custom Pino instance should be exported in a field called `logger`. This function will be called with the library's default Pino configuration, to allow you to extend it's behaviour (or completely replace it).

The instance returned by the function must implement a `.child` method, which will be called to create the child loggers for each log method.

For example:

```js
// next-logger.config.js
const pino = require('pino')

const logger = (defaultConfig) =>
  pino({
    ...defaultConfig,
    messageKey: 'message',
    mixin: () => ({ name: 'custom-pino-instance' }),
  })

module.exports = {
  logger,
}
```

Or with `winston`:

```sh
npm install winston
```

```js
const { createLogger, format, transports } = require('winston')

const logger = (defaultConfig) =>
  createLogger({
    transports: [
      new transports.Console({
        handleExceptions: true,
        format: format.json(),
      }),
    ],
  })

module.exports = {
  logger,
}
```

## Breaking Changes on >=1.0.0

This package name, `next-logger` has been inherited from [@frank47](https://github.com/franky47), who had deprecated their published logging middleware for Next.js. The original package and this one aim to solve similar problems for JSON logging in Next.js. However, the implementation and usage of this solution is significantly different from the original, which was published up to `v0.4.0`. To minimise unexpected issues for previous users of the original `next-logger`, the new package begins at major `v1.0.0`.

## Release changes

Changes are published to `npm`, however with 2FA rules in place for security, this cannot be achieved through GitHub Actions at this time. To release a new version, merge all work intended to be in the release, and then follow these steps:

```sh
npm version <major|minor|patch>
git push --follow-tags
npm publish
```

Then create a new release on GitHub, pointing to the tag created by `npm version`.

================================================
FILE: lib/defaultPinoConfig.js
================================================

const { format } = require('util')

module.exports = {
level: 'debug',
hooks: {
// https://getpino.io/#/docs/api?id=logmethod
logMethod(args, method) {
if (args.length < 2) {
// If there's only 1 argument passed to the log method, use Pino's default behaviour.
return method.apply(this, args)
}

      if (typeof args[0] === 'object' && typeof args[1] === 'string') {
        // If the first argument is an object, and the second is a string, we assume that it's a merging
        // object and message, followed by interpolation values.
        // This matches Pino's logger signature, so use the default behaviour.
        return method.apply(this, args)
      }

      if (typeof args[0] === 'string' && typeof args[1] === 'object') {
        // If the first argument is a string, and the second is an object, swap them round to use the object
        // as a merging object for Pino.
        const arg1 = args.shift()
        const arg2 = args.shift()
        return method.apply(this, [arg2, arg1, ...args])
      }

      if (args.every(arg => typeof arg === 'string')) {
        // If every argument is a string, we assume they should be concatenated together.
        // This is to support the existing behaviour of console, where multiple string arguments are concatenated into a single string.
        return method.apply(this, [format(...args)])
      }

      // If the arguments can't be changed to match Pino's signature, collapse them into a single merging object.
      const messageParts = []
      const mergingObject = {}

      args.forEach(arg => {
        if (Object.prototype.toString.call(arg) === '[object Error]') {
          // If the arg is an error, add it to the merging object in the same format Pino would.
          Object.assign(mergingObject, { err: arg, msg: arg.message })
        } else if (typeof arg === 'object') {
          // If the arg is an object, assign it's properties to the merging object.
          Object.assign(mergingObject, arg)
        } else {
          // Otherwise push it's value into an array for concatenation into a string.
          messageParts.push(arg)
        }
      })

      // Concatenate non-object arguments into a single string message.
      const message = messageParts.length > 0 ? format(...messageParts) : undefined

      return method.apply(this, [mergingObject, message])
    },

},
}

================================================
FILE: lib/logger.js
================================================

const { lilconfigSync } = require('lilconfig')

const defaultPinoConfig = require('./defaultPinoConfig')

let config = {}

const explorerSync = lilconfigSync('next-logger')
const results = explorerSync.search()

if (results && results.config) {
config = results.config
}

let logger

// If logger exists in the config file, and it's a function, use it as the logger constructor.
if ('logger' in config && typeof config.logger === 'function') {
logger = config.logger
} else {
// Otherwise, set the default logger constructor to Pino.
// eslint-disable-next-line global-require
logger = require('pino')
}

// Call the logger constructor with the library's default Pino configuration.
module.exports = logger(defaultPinoConfig)

================================================
FILE: lib/patches/console.js
================================================

const logger = require('../logger')

const getLogMethod = consoleMethod => {
const childLogger = logger.child({ name: 'console' })

switch (consoleMethod) {
case 'error':
return childLogger.error.bind(childLogger)
case 'warn':
return childLogger.warn.bind(childLogger)
case 'debug':
return childLogger.debug.bind(childLogger)
case 'log':
case 'info':
default:
return childLogger.info.bind(childLogger)
}
}

const consoleMethods = ['log', 'debug', 'info', 'warn', 'error']
consoleMethods.forEach(method => {
// eslint-disable-next-line no-console
console[method] = getLogMethod(method)
})

================================================
FILE: lib/patches/next.js
================================================

const nextLogger = require('next/dist/build/output/log')

const logger = require('../logger')

const getLogMethod = nextMethod => {
const childLogger = logger.child({ name: 'next.js', prefix: nextMethod })

switch (nextMethod) {
case 'error':
return childLogger.error.bind(childLogger)
case 'warn':
return childLogger.warn.bind(childLogger)
case 'trace':
if ('trace' in childLogger) {
return childLogger.trace.bind(childLogger)
}
// To support Winston which doesn't have logger.trace()
return childLogger.debug.bind(childLogger)
default:
return childLogger.info.bind(childLogger)
}
}

const cachePath = require.resolve('next/dist/build/output/log')
const cacheObject = require.cache[cachePath]

// This is required to forcibly redefine all properties on the logger.
// From Next 13 and onwards they're defined as non-configurable, preventing them from being patched.
cacheObject.exports = { ...cacheObject.exports }

Object.keys(nextLogger.prefixes).forEach(method => {
Object.defineProperty(cacheObject.exports, method, { value: getLogMethod(method) })
})

================================================
FILE: presets/all.js
================================================

require('../lib/patches/next')
require('../lib/patches/console')

================================================
FILE: presets/next-only.js
================================================

require('../lib/patches/next')
