# psc-release

> Install PureScript binary releases.

## Install

```sh
$ npm install psc-release
```

## Usage

```js
var pscRelease = require('psc-release');

pscRelease({}, function(e){
  if (e) console.log(e);
  else console.log('Latest release installed.');
});
```

## API

### pscRelease(options, callback)

Options may contain values specified below. The callback will be passed
an error when the install fails. No other value is provided to the
callback. The `pscRelease` function call returns no value.

## Options

### tag

Type: `String`
Default: `null`

Optional tag of the purescript release to install. The latest release of
PureScript is installed when the value is empty.

### github

Type: `Object`
Default: `{owner: 'purescript', repo: 'purescript'}`

Github owner and repository where purescript releases are uploaded to.

### os

Type: `Object`
Default: `{darwin: 'macos', linux: 'linux64'}`

Mapping of supported OS platform to Github asset filename.

### platform

Type: `String`
Default `require('os').platform()`

OS platform used to look up the asset filename from the `os` option.

### bin

Type: `String`
Default: `node_modules/.bin`

Destination directory for purescript binaries.

### del

Type: `Array`
Default: `['psc', 'psc-docs', 'psc-make', 'psci']`

Filenames of binaries to cleanup on failed install. The `bin` option is appended to the filename.

### temp

Type: `String`
Default: `psc-release`

Temporary directory name used to store downloaded assets.

### enc

Type: `String`
Default: `utf-8`

File encoding used during shasum check.
