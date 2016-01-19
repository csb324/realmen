var _ = require('underscore');
_.mixin( require('underscore.deferred') );
var Twit = require('twit');
var wordfilter = require('wordfilter');
var ent = require('ent');

if (process.env.NODE_ENV == "production") {
  T = new Twit({
    consumer_key:         process.env.CONSUMER_KEY,
    consumer_secret:      process.env.CONSUMER_SECRET,
    access_token:         process.env.ACCESS_TOKEN,
    access_token_secret:  process.env.ACCESS_TOKEN_SECRET
  })
} else {
  T = new Twit(require('./config.js'));
};
// var wordnikKey = require('./permissions.js').key;


Array.prototype.pick = function() {
  return this[Math.floor(Math.random()*this.length)];
};

Array.prototype.pickRemove = function() {
  var index = Math.floor(Math.random()*this.length);
  return this.splice(index,1)[0];
};

function generate() {
  var dfd = new _.Deferred();

  dfd.resolve('hi');
  return dfd.promise();
}

function tweet() {
  search("'real men'").then(function(newTweets) {
    getExistingTweets().then(function(oldTweets) {
      var myTweet = newTweets.pickRemove();
      var notBlacklisted = !wordfilter.blacklisted(myTweet);
      var notRepeated = (oldTweets.indexOf(myTweet) == -1);

      if (notRepeated) {
        console.log(myTweet);
      } else {
        return;
      }

      T.post('statuses/update', { status: myTweet }, function(err, reply) {
        if (err) {
          console.log('error:', err);
        } else {
          console.log('reply:', reply);
        }
      });
    });
  });
}


function search(term) {
  console.log('searching',term);
  var dfd = new _.Deferred();
  T.get('search/tweets', { q: term, count: 100, result_type: 'recent' }, function(err, reply) {
    if (err) {
      console.log('search error:',err);
    };
    var tweets = reply.statuses;
    tweets = _.chain(tweets)
      // decode weird characters
      .map(function(el) {
        if (el.retweeted_status) {
          return ent.decode(el.retweeted_status.text);
        }
        else {
          return ent.decode(el.text);
        }
      })
      .map(function(el) {
        return el.toLowerCase();
      })
      .map(function(el) {
        return el.split(".");
      })
      .reduce(function(a, b) {
        return a.concat(b);
      })
      .map(function(el) {
        return el.trim();
      })
      .filter(function(el) {
        var startsWithRealMen = (el.search(/(all |only )?real men/i) == 0);
        var noLinks = (el.search(/https?:/) == -1);
        var noMentions = (el.search(/@[^\s]/) == -1);

        return noLinks && startsWithRealMen && noMentions;
      })
      .uniq()
      .value();
    dfd.resolve(tweets);
  });
  return dfd.promise();
}

function getExistingTweets() {
  var dfd = new _.Deferred();
  T.get('statuses/user_timeline', {screen_name: 'mendothings'}, function(err, reply) {
    if (err) {
      console.log('search error:',err);
    };
    var tweets = reply.map(function(el) {
      return el.text;
    })

    dfd.resolve(tweets);
  });
  return dfd.promise()
}


function showResults() {
  search("'real men'").then(function(results) {
  // getExistingTweets().then(function(results) {
    console.log(results);
  });
}

// Tweet every 60 minutes
setInterval(function () {
  try {
    tweet();
  }
  catch (e) {
    console.log(e);
  }
}, 1000 * 60 * 60);

// Tweet once on initialization
// showResults();
tweet();

console.log(process.env);
