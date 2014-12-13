var os = require('os');

var fs = require('fs');

var path = require('path');

var crypto = require('crypto');

var github = require('github');

var chalk = require('chalk');

var error = chalk.magenta;

var info = chalk.cyan;

var lodash = require('lodash');

var request = require('request');

var decompress = require('decompress');

var temp = require('temp');

temp.track();

var promise = require('promise');

var scmp = require('scmp');

var del = require('del');

var spinner = require('char-spinner');

var options = { github: { owner: 'purescript', repo: 'purescript' }
              , os: { darwin: 'macos', linux: 'linux64' }
              , platform: os.platform()
              , bin: path.join('node_modules', '.bin')
              , del: ['psc', 'psc-docs', 'psc-make', 'psci']
              , temp: 'psc-release'
              , enc: 'utf-8'
              , tag: null };

var gh = new github({version: '3.0.0', protocol: 'https'});

function release(opts) {
  var find = function(res, rej, releases){
    var release = lodash.find(releases,
                              function(a){return a.tag_name === opts.tag;});
    if (!release) {
      if (!gh.hasNextPage(releases.meta.link)) {
        rej('Release not found for tag: ' + opts.tag);
      }
      else {
        gh.getNextPage(releases.meta.link, function(e, releases){
          if (e) rej(e);
          else find(res, rej, releases);
        });
      }
    }
    else {
      res(release);
    }
  };
  return new promise(function(res, rej){
    gh.releases.listReleases(opts.github, function(e, releases){
      if (e) rej(e);
      else {
        if (lodash.isEmpty(opts.tag)) {
          var head = lodash.head(releases);
          if (!(head && head.tag_name)) rej('Latest release found');
          else res(head);
        }
        else {
          find(res, rej, releases)
        }
      }
    });
  });
}

function assets(opts) {
  return function(release){
    return new promise(function(res, rej){
      var tar = lodash.find(release.assets,
                            function(a){return a.browser_download_url.indexOf(opts.os[opts.platform] + '.tar.gz') !== -1;});
      var sha = lodash.find(release.assets,
                            function(a){return a.browser_download_url.indexOf(opts.os[opts.platform] + '.sha') !== -1;});
      if (!(tar && sha)) rej('No .tar.gz or .sha found for: ' + opts.platform);
      else res({tar: tar, sha: sha});
    });
  };
}

function readsha(opts) {
  return function(assets){
    return new promise(function(res, rej){
      return temp.mkdir(options.temp, function(e, dir){
        var file = path.join(dir, assets.sha.name);
        var req = request(assets.sha.browser_download_url).pipe(fs.createWriteStream(file));
        req.on('close', function(){
          fs.readFile(file, {encoding: opts.enc}, function(e, data){
            if (e) rej(e);
            else res(lodash.extend(assets,
                                   {shasum: data.toString(opts.enc)}));
          });
        });
      });
    });
  };
}

function untar(opts) {
  return function(assets){
    return new promise(function(res, rej){
      return temp.mkdir(options.temp, function(e, dir){
        var shasum = crypto.createHash('sha1');
        var file = path.join(dir, assets.tar.name);
        var targz = new decompress().src(file).dest(opts.bin).use(decompress.targz({strip: 1}));
        var req = request(assets.tar.browser_download_url).pipe(fs.createWriteStream(file));
        req.on('close', function(){
          targz.run(function(e){
            if (e) rej(e);
            else {
              fs.readFile(file, function(e, data){
                if (e) rej(e);
                else {
                  shasum.update(data);
                  var sum = shasum.digest('hex') + '  ' + assets.tar.name + os.EOL;
                  if (!scmp(sum, assets.shasum)) rej('Shasum mismatch: [' + sum + ']' + os.EOL +
                                                     '                 [' + assets.shasum + ']');
                  else res();
                }
              });
            }
          });
        });
      });
    });
  };
}

function chmod(opts) {
  return function(){
    return promise.all(lodash.map(opts.del, function(bin){
      var file = path.join(opts.bin, bin);
      return new promise(function(res, rej){
        fs.chmod(file, '755', function(e){
          if (e) rej(e);
          else res();
        });
      });
    }));
  };
}

function cleanup(opts, cb) {
  del(lodash.map(opts.del,
                 function(a){return path.join(opts.bin, a)}), function(e, res){
    if (e) console.log(error(e))
    else console.log(info('Cleaned up: ' + res));
    cb(e);
  });
}

function install(opts, cb) {
  var o = lodash.extend({}, options, opts);
  if (lodash.isEmpty(o.os[o.platform])) throw new Error('unsupported platform');
  var interval = spinner();
  release(o).
  then(assets(o)).
  then(readsha(o)).
  then(untar(o)).
  then(chmod(o)).
  then(function(){ clearInterval(interval);
                   cb() },
       function(e){ clearInterval(interval);
                    console.log(error(e));
                    cleanup(o, cb); });
}

module.exports = install;
