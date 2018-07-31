# Beautiful error reporting for express

Beautiful, spec-compliant error reporting for express.

## What does this do?

This express middleware simplifies debugging errors in express applications by presenting errors in a developer-friendly way.

Features:
- Beautiful HTML error reports thanks to [youch](https://github.com/poppinss/youch)
- Respects the `Accept` HTTP header
- Hides sensitive information when running in production
- Compatible with other error middleware (custom error pages, custom error logging, ...)

## Usage

```
npm install express-youch
```

```js
const { errorReporter } = require('express-youch');

app.use(errorReporter());
```


## Recepies

### How do I customize the error pages?

When running in production (_ie. when the `NODE_ENV` environment variable is set to `production`._), `express-youch` will delegate HTML errors to the next error reporting middleware. Here is a basic example:

```js
const { errorReporter } = require('express-youch');

// First, pass the errors to the error reporter
app.use(errorReporter());

// Then add some custom handling logic
app.use(function (error, req, res, next) {
    if (!res.headersSent) {
        // If we get to this point, that means express-youch decided to delegate response rendering to the 
        // next handler in the chain. You can safely assume the client wants an HTML response here.
        res .status(error.statusCode)
            .render('error-page', { error });
    } else {
        next(error);
    }
});
```

The error object contains the properties `statusCode` and `message`, which you may use to create different error pages for different error types.

### How to better manage my errors

You should us a combination of an asynchronous express router such as [this one](https://www.npmjs.com/package/express-async-router) and the **async/await** syntax to make sure no errors leak outside of your control. Read [this blog post](https://www.npmjs.com/package/express-async-router) to learn more about error handling in express.
