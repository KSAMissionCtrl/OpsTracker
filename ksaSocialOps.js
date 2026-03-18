// Social feed display and operations
// Consolidated from Collections/tweet-display.js and social functions in ksaMainOps.js
// Depends on: helpFuncs.js (loadJsonTxt, dateToUT, flashUpdate), jQuery, Tipped

// ==============================================================================
// SOCIAL DISPLAY MODULE
// IIFE encapsulating all feed rendering, lightbox, and data management
// ==============================================================================

var SocialDisplay = (function() {
  'use strict';

  var config = {
    tweetsPath: 'http://www.kerbalspace.agency/KSA/wp-content/plugins/tweet-loader/tweets/',
    profileImage: 'https://pbs.twimg.com/profile_images/1064251777845850112/SPkeEIWH_400x400.jpg',
    tweetDB: 'tweets',
    accountHandle: 'KSA_MissionCtrl',
    accountName: 'Kerbal Space Agency',
    defaultMaxTweets: 0, // 0 = all posts
    defaultOrder: 'desc', // 'asc' or 'desc'
    isLoaded: true
  };

  var currentLightbox = {
    tweetId: null,
    images: [],
    index: 0
  };

  var tweetsDataCache = {}; // Store posts for lightbox display
  var updatesDataCache = []; // Store updates for unpublished posts
  var engageIds = [];
  var requestCounter = 0;
  var activeRequests = {};

  // Helper: Parse Twitter date format to JavaScript Date
  // Twitter format: "Wed Oct 10 20:19:24 +0000 2018"
  function parseTwitterDate(dateString) {
    if (!dateString) return new Date();

    var standardDate = new Date(dateString);
    if (!isNaN(standardDate.getTime())) {
      return standardDate;
    }

    // Parse Twitter's specific format: "Wed Oct 10 20:19:24 +0000 2018"
    var parts = dateString.split(' ');
    if (parts.length >= 6) {
      var month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(parts[1]) + 1;
      var day = parts[2];
      var time = parts[3];
      var year = parts[5];
      var timezone = parts[4];

      var isoString = year + '-' +
                      String(month).padStart(2, '0') + '-' +
                      String(day).padStart(2, '0') + 'T' +
                      time + timezone.substring(0, 3) + ':' + timezone.substring(3);

      return new Date(isoString);
    }

    console.warn('Could not parse date:', dateString);
    return new Date();
  }

  // Helper: Navigate to the selected social profile
  function getProfileUrl() {
    try {
      var selectedSocial = localStorage.getItem('ksaOps_selectedSocialIcon');
      if (selectedSocial) {
        var socialElement = document.querySelector('i[data-social="' + selectedSocial + '"]');
        if (socialElement) {
          var profileUrl = socialElement.getAttribute('data-url');
          if (profileUrl) {
            window.open(profileUrl, '_blank');
            return;
          }
        }
      }
      window.open('https://x.com/' + config.accountHandle, '_blank');
    } catch (e) {
      window.open('https://x.com/' + config.accountHandle, '_blank');
    }
  }

  // Helper: Get post data by ID from cache
  function getTweetData(tweetId) {
    var tweet = tweetsDataCache[tweetId];
    if (!tweet) return null;
    return tweet;
  }

  // Helper: Get the next post after the top-most one currently visible in the container
  // Returns the post ID, or null if the top post is the last in the collection
  function getNextTweetInCollection(collection) {
    var tweetContainer = document.getElementById('tweet-container');
    if (!tweetContainer) return null;

    var firstTweetEl = tweetContainer.querySelector('.tweet');
    if (!firstTweetEl) return null;

    var topId = firstTweetEl.id.replace('tweet-', '');
    var idx = collection.indexOf(topId);
    if (idx === -1 || idx - 1 < 0) return null;

    return collection[idx - 1] || null;
  }

  // Helper: Pass a copy of the update array and erase the cached version to prevent reuse
  function fetchUpdateData() {
    if (updatesDataCache.length === 0) return null;
    var dataCopy = updatesDataCache.slice();
    updatesDataCache = [];
    return dataCopy;
  }

  // Helper: Load a plain-text file (collection ID list, engage list, etc.)
  // progressCallback(loaded, total, lengthComputable) - optional
  function loadTextFile(url, callback, progressCallback) {
    // Date-based cache busting so same-day visits share the browser cache
    var cacheBuster = new Date().toISOString().split('T')[0];
    var urlWithCacheBuster = url + (url.indexOf('?') !== -1 ? '&_=' : '?_=') + cacheBuster;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', urlWithCacheBuster, true);
    if (progressCallback) {
      xhr.onprogress = function(e) {
        progressCallback(e.loaded, e.total, e.lengthComputable);
      };
    }
    xhr.onload = function() {
      if (xhr.status === 200) {
        callback(null, xhr.responseText);
      } else {
        callback(new Error('Failed to load: ' + url), null);
      }
    };
    xhr.onerror = function() {
      callback(new Error('Network error loading: ' + url), null);
    };
    xhr.send();
  }

  // Helper: Build a link element for a URL embedded in a post
  // If the URL points to ops.kerbalspace.agency, return a fauxLink span that calls swapContent()
  // Otherwise return a standard anchor tag
  function buildUrlLink(url) {
    if (url.expanded_url && url.expanded_url.indexOf('ops.kerbalspace.agency') !== -1) {
      var queryString = url.expanded_url.split('?')[1];
      if (queryString) {
        var params = {};
        queryString.split('&').forEach(function(pair) {
          var kv = pair.split('=');
          if (kv.length === 2) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
        });

        var type, id, ut;
        if (params.db && params.db !== 'bodies') { type = 'vessel'; id = params.db; }
        else if (params.vessel) { type = 'vessel'; id = params.vessel; }
        else if (params.body) { type = 'body'; id = params.body; }
        else if (params.crew) {
          type = params.crew === 'crewFull' ? 'crewFull' : 'crew';
          id = params.crew;
        }
        if (params.ut) ut = params.ut;

        if (type && id) {
          var onclick = "swapContent('" + type + "','" + id + "'" + (ut ? "," + ut : "") + ")";
          return '<span class="fauxLink" onclick="' + onclick + '">' + escapeHtml(url.display_url) + '</span>';
        }
      }
    }
    return '<a href="' + escapeHtml(url.expanded_url) + '" target="_blank">' + escapeHtml(url.display_url) + '</a>';
  }

  // Helper: Escape HTML to prevent XSS
  function escapeHtml(text) {
    if (!text) return '';
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  // Helper: Build media HTML and strip the media URL from post text
  function buildMediaHtml(tweet, tweetText, forLightbox) {
    var mediaHtml = '';
    if (!tweet.media || tweet.media.length === 0) return { mediaHtml: mediaHtml, tweetText: tweetText };

    var firstMedia = tweet.media[0];

    if (firstMedia.type === 'video' || firstMedia.type === 'animated_gif') {
      mediaHtml += '<a href="https://x.com/' + config.accountHandle + '/status/' + tweet.id + '" target="_blank">';
      mediaHtml += '<div class="overlay-container">';
      mediaHtml += '<img class="tweet-image" src="' + escapeHtml(firstMedia.media_url) + '" alt="Tweet media">';
      mediaHtml += '<div class="play-overlay">▶</div>';
      mediaHtml += '</div></a>';
    } else {
      mediaHtml += '<div class="grid-container images-' + tweet.media.length + '" data-tweet-id="' + tweet.id + '">';
      tweet.media.forEach(function(media, index) {
        var mediaUrl = media.media_url;
        var fullUrl = (media.type !== 'custom')
          ? mediaUrl.replace(/\.\w+$/, '') + '?format=png&name=large'
          : (media.url || mediaUrl);

        var altText = media.alt_text || '';
        mediaHtml += '<a href="#" class="media-wrapper lightbox-trigger" data-tweet-id="' + tweet.id + '" data-image-index="' + index + '" data-image-url="' + escapeHtml(fullUrl) + '" data-alt-text="' + escapeHtml(altText) + '">';
        mediaHtml += '<img class="grid-img" src="' + escapeHtml(mediaUrl) + '" alt="Tweet media">';
        if (altText) {
          mediaHtml += '<span class="alt-text-indicator" title="Image has description">💬</span>';
        }
        mediaHtml += '</a>';
      });
      mediaHtml += '</div>';
    }

    if (firstMedia.url) {
      tweetText = tweetText.split(firstMedia.url).join('');
    }

    return { mediaHtml: mediaHtml, tweetText: tweetText };
  }

  // Helper: Process post text (replace URLs, handles, whitespace, newlines)
  function processPostText(tweet, tweetText) {
    if (tweet.urls && tweet.urls.length > 0) {
      tweet.urls.forEach(function(url) {
        tweetText = tweetText.split(url.url).join(buildUrlLink(url));
      });
    }
    tweetText = tweetText.split('@' + config.accountHandle).join('');
    tweetText = tweetText.replace(/@(\w+)/g, '<a href="https://x.com/$1" target="_blank">@$1</a>');
    tweetText = tweetText.replace(/  +/g, function(match) { return '&nbsp;'.repeat(match.length); });
    tweetText = tweetText.replace(/\n/g, '<br>');
    return tweetText;
  }

  // Helper: Format a post timestamp to Eastern Time
  function formatTimestamp(tweet) {
    var date = parseTwitterDate(tweet.created_at);
    return date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short', year: 'numeric'
    });
  }

  // Helper: Build the actions row HTML (retweets, likes, conversation link)
  function buildActionsHtml(tweet) {
    var html = '<div class="tweet-actions">';
    if (tweet.retweet_count !== null) {
      html += '<div class="tweet-action' + (tweet.retweet_count > 0 ? '' : ' zero') + '"><span>🔄</span> ' + tweet.retweet_count + '</div>';
    }
    if (tweet.favorite_count !== null) {
      html += '<div class="tweet-action' + (tweet.favorite_count > 0 ? '' : ' zero') + '"><span>❤️</span> ' + tweet.favorite_count + '</div>';
    }
    if (engageIds.indexOf(tweet.id) !== -1) {
      html += '<a class="tweet-action" href="https://x.com/' + config.accountHandle + '/status/' + tweet.id + '" target="_blank"><span>💬</span> View Conversation</a>';
    }
    html += '</div>';
    return html;
  }

  // Helper: Format post HTML for inline feed display
  function formatTweet(tweet, isDateBoundary, order) {
    var tweetText = tweet.text;
    tweetText = processPostText(tweet, tweetText);
    var built = buildMediaHtml(tweet, tweetText, false);

    var dateBoundaryClass = isDateBoundary ? ' date-boundary' : '';
    var timestamp = formatTimestamp(tweet);

    var html = '<div class="tweet' + dateBoundaryClass + '" id="tweet-' + tweet.id + '">';
    html += '<a name="' + tweet.id + '"></a>';
    html += '<img class="tweet-profile-img" src="' + config.profileImage + '" alt="Profile picture">';
    html += '<div class="tweet-content">';
    html += '<div class="tweet-header">';
    html += '<span class="tweet-name" onclick="SocialDisplay.getProfileUrl()">' + config.accountName + '</span>';
    html += '<span class="tweet-handle">@' + config.accountHandle + '</span>';
    html += '</div>';
    html += '<div class="tweet-text">' + built.tweetText + '</div>';
    html += built.mediaHtml;
    html += '<p class="full-timestamp" onclick="openSocialPost(\'' + tweet.id + '\')">' + timestamp + '</p>';
    html += buildActionsHtml(tweet);
    html += '</div>';
    html += '<i class="fa-solid fa-expand tweet-expand-icon" data-tweet-id="' + tweet.id + '"></i>';
    html += '</div>';

    return html;
  }

  // Helper: Format post HTML for the full-size tweet lightbox
  function formatTweetForLightbox(tweet) {
    var tweetText = tweet.text;
    tweetText = processPostText(tweet, tweetText);
    var built = buildMediaHtml(tweet, tweetText, true);

    var timestamp = formatTimestamp(tweet);

    var html = '<div class="tweet" id="lightbox-tweet-' + tweet.id + '">';
    html += '<img class="tweet-profile-img" src="' + config.profileImage + '" alt="Profile picture">';
    html += '<div class="tweet-content">';
    html += '<div class="tweet-header">';
    html += '<span class="tweet-name" onclick="SocialDisplay.getProfileUrl()">' + config.accountName + '</span>';
    html += '<span class="tweet-handle">@' + config.accountHandle + '</span>';
    html += '</div>';
    html += '<div class="tweet-text">' + built.tweetText + '</div>';
    html += built.mediaHtml;
    html += '<p class="full-timestamp" onclick="openSocialPost(\'' + tweet.id + '\')">' + timestamp + '</p>';
    html += buildActionsHtml(tweet);
    html += '</div>';
    html += '</div>';

    return html;
  }

  // Display posts in container - loads collection, engages list, and archive JSON
  function displayTweets(options) {
    config.isLoaded = false;
    config.tweetDB = options.tweetDB ? options.tweetDB : "tweets";
    var containerEl = document.getElementById(options.containerId);
    if (!containerEl) {
      console.error('Social feed container not found:', options.containerId);
      return;
    }

    var collectionFile = options.collectionFile || '13573';
    var order = options.order || config.defaultOrder;
    var maxTweets = options.maxTweets || config.defaultMaxTweets;

    // Generate unique request ID and cancel any previous requests for this container
    var requestId = ++requestCounter;
    activeRequests[options.containerId] = requestId;

    containerEl.innerHTML = '<div class="tweet-loading">Requesting updates...</div>';

    // Load post IDs for the collection
    loadTextFile(config.tweetsPath + collectionFile + '.txt', function(err, data) {

      if (activeRequests[options.containerId] !== requestId) {
        console.log('Social feed request cancelled (superseded by newer request)');
        return;
      }

      if (err) {
        containerEl.innerHTML = '<p class="tweet-error">No updates found.</p>';
        return;
      }

      var tweetIds = data.split('\n')
        .map(function(line) { return line.trim(); })
        .filter(function(line) { return line.length > 0; });

      // Remove duplicates
      tweetIds = tweetIds.filter(function(item, pos) {
        return tweetIds.indexOf(item) === pos;
      });

      // Sort by numeric ID (Twitter snowflake IDs are time-ordered)
      if (order === 'desc') {
        tweetIds.sort(function(a, b) { return Number(b) - Number(a); });
      } else {
        tweetIds.sort(function(a, b) { return Number(a) - Number(b); });
      }

      // If an active vessel or crew has this timeline, cache the ID list for FF navigation
      if (ops.currentVessel && !ops.currentVessel.timelineTweets) {
        var craft = ops.craftsMenu.find(o => o.timeline === options.collectionFile);
        if (craft && craft.db == ops.currentVessel.Catalog.DB) ops.currentVessel.timelineTweets = tweetIds.slice();
      }
      if (ops.currentCrew && !ops.currentCrew.timelineTweets) {
        var crew = ops.crewMenu.find(o => o.timeline === options.collectionFile);
        if (crew && crew.db == ops.currentCrew.Background.Kerbal) ops.currentCrew.timelineTweets = tweetIds.slice();
      }

      // Load the conversation-engage list
      loadTextFile(config.tweetsPath + 'engage.txt', function(engageErr, engageData) {

        if (activeRequests[options.containerId] !== requestId) {
          console.log('Social feed request cancelled (superseded by newer request)');
          return;
        }

        if (!engageErr && engageData) {
          engageIds = engageData.split('\n')
            .map(function(line) { return line.trim(); })
            .filter(function(line) { return line.length > 0; });
        }

        // Progress callback: update the loading indicator as the archive downloads
        function onJsonProgress(loaded, total, lengthComputable) {
          var loadingEl = containerEl.querySelector('.tweet-loading');
          if (!loadingEl) return;
          var label = config.tweetDB === 'tweets' ? 'Loading full history\u2026 ' : 'Loading recent history\u2026 ';
          if (lengthComputable && total > 0) {
            loadingEl.textContent = label + Math.round((loaded / total) * 100) + '%';
          } else {
            loadingEl.textContent = label + Math.round(loaded / 1024) + ' KB';
          }
        }

        // Use loadJsonTxt from helpFuncs.js to fetch and parse the archive
        var jsonUrl = config.tweetsPath + config.tweetDB + '.json.txt';
        loadJsonTxt(jsonUrl, function(tweetsErr, allObjects) {

          var loadingEl = containerEl.querySelector('.tweet-loading');
          if (loadingEl) loadingEl.textContent = 'Parsing updates\u2026';

          if (activeRequests[options.containerId] !== requestId) {
            console.log('Social feed request cancelled (superseded by newer request)');
            return;
          }

          if (tweetsErr) {
            containerEl.innerHTML = '<p class="tweet-error">Failed to load updates.</p>';
            console.error(tweetsErr);
            return;
          }

          // Build default stubs for each requested ID, then fill from archive
          var tweetsData = {};
          tweetIds.forEach(function(id) {
            tweetsData[id] = {
              id: id, xtwit: null, bsky: null, threads: null, mstdn: null,
              text: '', created_at: '', media: [], urls: [],
              reply_count: 0, retweet_count: 0, favorite_count: 0,
              retweeted: false, favorited: false, UT: null, collections: []
            };
          });

          var foundIds = [];
          allObjects.forEach(function(jsonObj) {
            jsonObj.UT = dateToUT(luxon.DateTime.fromJSDate(parseTwitterDate(jsonObj.created_at))) || null;
            jsonObj.collections = jsonObj.collections ? jsonObj.collections.split(',') : [];

            // Cache every object so the live-update system can schedule future posts
            updatesDataCache.push(jsonObj);

            if (tweetIds.indexOf(jsonObj.id) !== -1) {
              tweetsData[jsonObj.id] = {
                id: jsonObj.id,
                xtwit: jsonObj.xtwit || null,
                bsky: jsonObj.bsky || null,
                threads: jsonObj.threads || null,
                mstdn: jsonObj.mstdn || null,
                text: jsonObj.text || '',
                created_at: jsonObj.created_at || '',
                media: jsonObj.media || [],
                urls: jsonObj.urls || [],
                reply_count: jsonObj.reply_count || 0,
                retweet_count: jsonObj.retweet_count || 0,
                favorite_count: jsonObj.favorite_count || 0,
                retweeted: jsonObj.retweeted || false,
                favorited: jsonObj.favorited || false,
                UT: jsonObj.UT || null,
                collections: jsonObj.collections
              };
              foundIds.push(jsonObj.id);
            }
          });

          var missingIds = tweetIds.filter(function(id) { return foundIds.indexOf(id) === -1; });
          if (missingIds.length && missingIds.length <= 5) {
            console.warn('[Social Loader] Missing ' + missingIds.length + ' posts:', missingIds);
          }

          var tweetsArray = tweetIds.map(function(id) { return tweetsData[id]; });
          tweetsDataCache = tweetsData;

          var totalTweets = 0;
          var forbreak = false;
          var lastIncludedId = null;

          var html = '<div id="tweet-container" class="inline-tweets" data-order="' + order + '" data-collection="' + collectionFile + '">';

          for (var i = 0; i < tweetsArray.length; i++) {
            if (maxTweets > 0 && totalTweets >= maxTweets) {
              forbreak = true;
              break;
            }

            var tweet = tweetsArray[i];
            var isDateBoundary = false;

            if (options.UT == null || tweet.UT <= options.UT) {
              if (i < tweetsArray.length - 1) {
                var currentDay = parseTwitterDate(tweet.created_at).toISOString().split('T')[0];
                var nextDay = parseTwitterDate(tweetsArray[i + 1].created_at).toISOString().split('T')[0];
                isDateBoundary = (currentDay !== nextDay);
              }
              html += formatTweet(tweet, isDateBoundary, order);
              lastIncludedId = tweet.id;
              totalTweets++;
            }
          }

          if (forbreak) {
            html += '<div style="text-align: center; padding: 5px 0;">';
            html += '<a href="http://www.kerbalspace.agency/?p=' + collectionFile + '#' + lastIncludedId + '" target="_blank" style="font-size: 16px; color: #1da1f2; text-decoration: none; font-weight: 500;">View Full Collection →</a>';
            html += '</div>';
          }

          if (totalTweets === 0) {
            html += '<p class="tweet-error">No updates available</p>';
          }

          html += '</div>';
          containerEl.innerHTML = html;

          initializeLightbox();
          initializeTweetLightbox();

          // Badge the top post when swapping to an updated source
          if (options.update && totalTweets > 0) {
            var tweetContainer = document.getElementById('tweet-container');
            var firstTweetEl = tweetContainer ? tweetContainer.querySelector('.tweet') : null;
            if (firstTweetEl) {
              firstTweetEl.insertAdjacentHTML('beforeend', '<i class="fa-solid fa-certificate fa-1xs change-indicator" style="color: #1da1f2; cursor: pointer; position: absolute; top: 10px; right: 10px;"></i>');
            }
          }

          config.isLoaded = true;
        }, onJsonProgress);
      });
    });
  }

  // Prepend a newly-arrived post to the live feed
  function addTweet(tweet) {
    if (!tweet || !tweet.id) {
      console.error('[SocialDisplay] addTweet: invalid post object');
      return;
    }

    tweet.text = tweet.text || '';
    tweet.media = tweet.media || [];
    tweet.urls = tweet.urls || [];
    tweet.reply_count = tweet.reply_count || 0;
    tweet.retweet_count = tweet.retweet_count !== undefined ? tweet.retweet_count : null;
    tweet.favorite_count = tweet.favorite_count !== undefined ? tweet.favorite_count : null;
    tweet.retweeted = tweet.retweeted || false;
    tweet.favorited = tweet.favorited || false;
    tweet.created_at = tweet.created_at || '';
    tweet.UT = tweet.UT || dateToUT(luxon.DateTime.fromJSDate(parseTwitterDate(tweet.created_at))) || null;
    tweet.collections = tweet.collections || [];

    tweetsDataCache[tweet.id] = tweet;

    var tweetContainer = document.getElementById('tweet-container');
    if (!tweetContainer) {
      console.warn('[SocialDisplay] addTweet: #tweet-container not found, post cached only');
      return;
    }

    var order = tweetContainer.getAttribute('data-order') || config.defaultOrder;

    var isDateBoundary = false;
    var firstTweet = tweetContainer.querySelector('.tweet');
    if (firstTweet && order === 'desc') {
      var newDay = parseTwitterDate(tweet.created_at).toISOString().split('T')[0];
      var firstTweetId = firstTweet.id.replace('tweet-', '');
      var firstTweetData = tweetsDataCache[firstTweetId];
      if (firstTweetData) {
        var firstDay = parseTwitterDate(firstTweetData.created_at).toISOString().split('T')[0];
        isDateBoundary = (newDay !== firstDay);
      }
    }

    var tweetHtml = formatTweet(tweet, isDateBoundary, order);
    tweetContainer.insertAdjacentHTML('afterbegin', tweetHtml);

    // Certificate badge signals a newly-arrived post; fades on hover via ksaMainOps.js handler
    var newTweetEl = document.getElementById('tweet-' + tweet.id);
    if (newTweetEl) {
      newTweetEl.insertAdjacentHTML('beforeend', '<i class="fa-solid fa-certificate fa-1xs change-indicator" style="color: #1da1f2; cursor: pointer; position: absolute; top: 10px; right: 10px;"></i>');
    }

    flashUpdate('#tweet-' + tweet.id, '#1da1f233', '');

    initializeLightbox();
    initializeTweetLightbox();
  }

  // Initialize (or re-initialize) the image lightbox
  function initializeLightbox() {
    var lightbox = document.getElementById('tweet-lightbox');
    if (!lightbox) {
      var lightboxHtml = '<div id="tweet-lightbox" class="lightbox" style="display: none;">';
      lightboxHtml += '<span class="lightbox-close">&times;</span>';
      lightboxHtml += '<button class="lightbox-prev">&#10094;</button>';
      lightboxHtml += '<button class="lightbox-next">&#10095;</button>';
      lightboxHtml += '<div class="lightbox-loading">Loading...</div>';
      lightboxHtml += '<div class="lightbox-content">';
      lightboxHtml += '<img id="lightbox-image" src="" alt="" style="display: none;">';
      lightboxHtml += '<div id="lightbox-alt-text" class="lightbox-alt-text"></div>';
      lightboxHtml += '<div class="lightbox-counter"></div>';
      lightboxHtml += '</div>';
      lightboxHtml += '</div>';
      document.body.insertAdjacentHTML('beforeend', lightboxHtml);
      lightbox = document.getElementById('tweet-lightbox');
    }

    var lightboxImg = document.getElementById('lightbox-image');
    var lightboxAltText = document.getElementById('lightbox-alt-text');
    var lightboxCounter = document.querySelector('.lightbox-counter');
    var closeBtn = document.querySelector('.lightbox-close');
    var prevBtn = document.querySelector('.lightbox-prev');
    var nextBtn = document.querySelector('.lightbox-next');

    function openLightbox(tweetId, imageIndex) {
      var tweetLightbox = document.getElementById('tweet-display-lightbox');
      if (tweetLightbox && tweetLightbox.style.display === 'flex') {
        tweetLightbox.style.display = 'none';
      }

      currentLightbox.tweetId = tweetId;
      currentLightbox.index = imageIndex;

      var gridContainer = document.querySelector('.grid-container[data-tweet-id="' + tweetId + '"]');
      if (!gridContainer) return;

      var triggers = gridContainer.querySelectorAll('.lightbox-trigger');
      currentLightbox.images = Array.from(triggers).map(function(trigger) {
        return {
          url: trigger.getAttribute('data-image-url'),
          altText: trigger.getAttribute('data-alt-text')
        };
      });

      showImage(currentLightbox.index);
      lightbox.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }

    function showImage(index) {
      if (currentLightbox.images.length === 0) return;

      currentLightbox.index = index;
      var image = currentLightbox.images[currentLightbox.index];

      var loadingIndicator = document.querySelector('.lightbox-loading');
      loadingIndicator.style.display = 'block';
      lightboxImg.style.display = 'none';
      lightboxCounter.style.display = 'none';
      lightboxAltText.style.display = 'none';

      var imgPreload = new Image();
      imgPreload.onload = function() {
        lightboxImg.src = image.url;
        lightboxImg.style.display = 'block';
        loadingIndicator.style.display = 'none';

        if (image.altText) {
          lightboxAltText.textContent = image.altText;
          lightboxAltText.style.display = 'block';
        } else {
          lightboxAltText.style.display = 'none';
        }

        if (currentLightbox.images.length <= 1) {
          prevBtn.style.display = 'none';
          nextBtn.style.display = 'none';
        } else {
          prevBtn.style.display = 'block';
          nextBtn.style.display = 'block';
        }

        lightboxCounter.textContent = (currentLightbox.index + 1) + ' / ' + currentLightbox.images.length;
        lightboxCounter.style.display = currentLightbox.images.length > 1 ? 'block' : 'none';
      };

      imgPreload.onerror = function() {
        loadingIndicator.textContent = 'Failed to load image';
        setTimeout(function() {
          loadingIndicator.style.display = 'none';
          loadingIndicator.textContent = 'Loading...';
        }, 2000);
      };

      imgPreload.src = image.url;
    }

    function closeLightbox() {
      lightbox.style.display = 'none';
      document.body.style.overflow = '';
      currentLightbox.tweetId = null;
      currentLightbox.images = [];
      currentLightbox.index = 0;
    }

    function nextImage() {
      showImage(currentLightbox.index < currentLightbox.images.length - 1 ? currentLightbox.index + 1 : 0);
    }

    function prevImage() {
      showImage(currentLightbox.index > 0 ? currentLightbox.index - 1 : currentLightbox.images.length - 1);
    }

    document.querySelectorAll('.lightbox-trigger').forEach(function(trigger) {
      trigger.addEventListener('click', function(e) {
        e.preventDefault();
        openLightbox(this.getAttribute('data-tweet-id'), parseInt(this.getAttribute('data-image-index'), 10));
      });
    });

    if (closeBtn) closeBtn.onclick = closeLightbox;
    if (lightbox) {
      lightbox.onclick = function(e) { if (e.target === lightbox) closeLightbox(); };
    }
    if (prevBtn) prevBtn.onclick = function(e) { e.stopPropagation(); prevImage(); };
    if (nextBtn) nextBtn.onclick = function(e) { e.stopPropagation(); nextImage(); };

    document.addEventListener('keydown', function(e) {
      if (lightbox.style.display === 'flex') {
        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowRight') nextImage();
        else if (e.key === 'ArrowLeft') prevImage();
      }
    });
  }

  // Initialize (or re-initialize) the full-post lightbox
  function initializeTweetLightbox() {
    var tweetLightbox = document.getElementById('tweet-display-lightbox');
    if (!tweetLightbox) {
      var lightboxHtml = '<div id="tweet-display-lightbox" class="tweet-lightbox" style="display: none;">';
      lightboxHtml += '<span class="tweet-lightbox-close">&times;</span>';
      lightboxHtml += '<div class="tweet-lightbox-content lightbox-tweet-container">';
      lightboxHtml += '</div>';
      lightboxHtml += '</div>';
      document.body.insertAdjacentHTML('beforeend', lightboxHtml);
      tweetLightbox = document.getElementById('tweet-display-lightbox');
    }

    var closeBtn = document.querySelector('.tweet-lightbox-close');

    function openTweetLightbox(tweetId) {
      var tweet = tweetsDataCache[tweetId];
      if (!tweet) {
        console.error('Post not found in cache:', tweetId);
        return;
      }

      var content = document.querySelector('.tweet-lightbox-content');
      content.innerHTML = formatTweetForLightbox(tweet);

      initializeLightbox();

      tweetLightbox.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }

    function closeTweetLightbox() {
      tweetLightbox.style.display = 'none';
      document.body.style.overflow = '';
    }

    document.querySelectorAll('.tweet-lightbox-trigger').forEach(function(trigger) {
      trigger.addEventListener('click', function(e) {
        e.preventDefault();
        openTweetLightbox(this.getAttribute('data-tweet-id'));
      });
    });

    document.querySelectorAll('.tweet-expand-icon').forEach(function(icon) {
      icon.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openTweetLightbox(this.getAttribute('data-tweet-id'));
      });
    });

    if (closeBtn) closeBtn.onclick = closeTweetLightbox;
    if (tweetLightbox) {
      tweetLightbox.onclick = function(e) { if (e.target === tweetLightbox) closeTweetLightbox(); };
    }

    document.addEventListener('keydown', function(e) {
      if (tweetLightbox.style.display === 'flex') {
        if (e.key === 'Escape') closeTweetLightbox();
      }
    });
  }

  // Initialize social icon bar (moved from setupContent in ksaMainOps.js)
  // showOpt: 'mouseenter' (desktop) or 'click' (touch)
  function initSocialIcons(showOpt) {
    var savedSocial = localStorage.getItem('ksaOps_selectedSocialIcon') || 'x-twitter';
    $('#socialIcons i').removeClass('active');
    $('#socialIcons i[data-social="' + savedSocial + '"]').addClass('active');

    $('#socialIcons i').on('click', function(e) {
      window.open($(this).data('url'), '_blank');
    });

    $('#socialIcons i').on('contextmenu', function(e) {
      e.preventDefault();
      $('#socialIcons i').removeClass('active');
      $(this).addClass('active');
      localStorage.setItem('ksaOps_selectedSocialIcon', $(this).data('social'));
    });

    Tipped.create('#socialIcons i', 'Left-click: Open social profile<br>Right-click: Set default platform<br>to open via update timestamps', {
      position: 'top',
      showOn: showOpt,
      hideOnClickOutside: is_touch_device()
    });
  }

  // Public API
  return {
    displayTweets: displayTweets,
    getProfileUrl: getProfileUrl,
    getTweetData: getTweetData,
    getNextTweetInCollection: getNextTweetInCollection,
    fetchUpdateData: fetchUpdateData,
    addTweet: addTweet,
    initSocialIcons: initSocialIcons,
    config: config
  };
})();

// ==============================================================================
// SOCIAL FEED OPERATIONS
// Functions that coordinate the social feed with the main Ops update system
// ==============================================================================

// Switches the social timeline source shown in the sidebar feed
function swapTwitterSource(swap, source, update=false) {

  // Wait for ops data and current feed load before proceeding to avoid double-loads
  if (!ops.updateData.length || (!ops.updateTweets && ops.updateData.find(o => o.isLoading === true)) || !SocialDisplay.config.isLoaded) {
    return setTimeout(swapTwitterSource, 250, swap, source, update);
  }

  // Ensure source is a string (in case it comes from ASP as a number)
  if (source) source = String(source);

  if (swap && source) {
    $("#twitterTimelineSelection").html("Source: <span class='fauxLink' onclick=\"swapTwitterSource('" + swap + "')\">KSA Main Feed</span> | <b>" + swap + "</b>");
    ops.twitterSource = source;
  } else if (swap && !source) {
    $("#twitterTimelineSelection").html("Source: <b>KSA Main Feed</b> | <span class='fauxLink' onclick=\"swapTwitterSource('" + swap + "', '" + ops.twitterSource + "')\">" + swap + "</span>");
  } else if (!swap && !source) {
    $("#twitterTimelineSelection").html("Source: <b>KSA Main Feed</b>");
  }
  if (!source) {
    source = "13573";
    ops.twitterSource = source;
  }

  if (KSA_UI_STATE.isLivePastUT) var tweetDB = "tweets";
  else var tweetDB = "tweetstrimmed";

  SocialDisplay.displayTweets({
    containerId: 'twitterTimeline',
    collectionFile: source,
    order: 'desc',
    tweetDB: tweetDB,
    maxTweets: 25,
    UT: currUT(),
    update: update
  });
}

// Opens a social post in the platform selected by the user
function openSocialPost(tweetid) {
  var bOpened = true;
  var tweet = SocialDisplay.getTweetData(tweetid);

  if (!tweet) {
    console.log("could not find post with id", tweetid);
    return;
  }

  var selectedSocial = localStorage.getItem('ksaOps_selectedSocialIcon');
  if (selectedSocial && selectedSocial != "x-twitter") {
    if (selectedSocial == "bluesky") {
      if (tweet.bsky) window.open('https://bsky.app/profile/ksa-missionctrl.bsky.social/post/' + tweet.bsky, '_blank');
      else {
        window.open('https://bsky.app/profile/ksa-missionctrl.bsky.social', '_blank');
        bOpened = false;
      }
    } else if (selectedSocial == "threads") {
      if (tweet.threads) window.open('https://www.threads.com/@ksa_missionctrl/post/' + tweet.threads, '_blank');
      else {
        window.open('https://www.threads.com/@ksa_missionctrl', '_blank');
        bOpened = false;
      }
    } else if (selectedSocial == "mastodon") {
      if (tweet.mstdn) window.open('https://mastodon.social/@ksa_missionctrl/' + tweet.mstdn, '_blank');
      else {
        window.open('https://mastodon.social/@ksa_missionctrl', '_blank');
        bOpened = false;
      }
    }
  } else {
    // If no platform-specific IDs are set this is an older/edited post - use the original X ID directly
    if (!tweet.xtwit && !tweet.bsky && !tweet.threads && !tweet.mstdn) window.open('https://x.com/ksa_missionctrl/status/' + tweet.id, '_blank');
    else if (tweet.xtwit) window.open('https://x.com/ksa_missionctrl/status/' + tweet.xtwit, '_blank');
    else {
      bOpened = false;
      window.open('https://x.com/ksa_missionctrl', '_blank');
    }
  }

  if (!bOpened && !localStorage.getItem('ksaOps_socialMsgSeen')) {
    $("#siteDialog").html("We can't take you directly to this post, but you will likely have found it easily within the main profile feed as this issue generally only affects posts within the past few days. There is also the chance that it was not posted at all here. For more information <a href='https://github.com/KSAMissionCtrl/OpsTracker/wiki/Social-Feed' target='_blank'>see our wiki</a><br><br><label style='cursor: pointer;'><input type='checkbox' id='socialMsgDontShow' checked style='cursor: pointer;'> Don't show again</label>");
    $("#siteDialog").dialog("option", { title: "Social Feeds Notice", buttons: [{
      text: "Close",
      click: function() {
        if ($("#socialMsgDontShow").is(":checked")) localStorage.setItem('ksaOps_socialMsgSeen', 'true');
        $("#siteDialog").dialog("close");
      }
    }]});
    $("#siteDialog").dialog("open");
  }
}

// Iterative function to schedule future posts into the updates list without blocking the browser
function processTweetUpdates(step = 0) {
  switch (step) {

    // sort highest to lowest by UT
    case 0:
      ops.updateTweets.sort(function(a,b) { return (a.UT < b.UT) ? 1 : ((b.UT < a.UT) ? -1 : 0); });
      step = 1;
      setTimeout(processTweetUpdates, 100, step);
      break;

    // find the first post earlier than current UT; slice to keep only future posts
    case 1:
      var index = ops.updateTweets.findIndex(tweet => tweet.UT < currUT());
      if (index > -1) ops.updateTweets = ops.updateTweets.slice(0, index);
      else ops.updateTweets = [];
      step = 2;
      setTimeout(processTweetUpdates, 100, step);
      break;

    // resort lowest to highest
    case 2:
      if (ops.updateTweets.length) {
        ops.updateTweets.sort(function(a,b) { return (a.UT > b.UT) ? 1 : ((b.UT > a.UT) ? -1 : 0); });
        step = 3;
        setTimeout(processTweetUpdates, 100, step);
      }
      break;

    // add just the next post to the update list and re-sort
    case 3:
      if (ops.updateTweets.length) {

        // check if any of the post's collections match a tracked vessel or crew
        var objIDs = [];
        ops.craftsMenu.forEach(function(craft) {
          if (craft.timeline && ops.updateTweets[0].collections.includes(craft.timeline)) objIDs.push(craft.db);
        });
        ops.crewMenu.forEach(function(crew) {
          if (crew.timeline && ops.updateTweets[0].collections.includes(crew.timeline)) objIDs.push(crew.db);
        });

        ops.updatesList.push({ type: "tweet", data: ops.updateTweets[0], UT: ops.updateTweets[0].UT, id: objIDs.length ? objIDs : null });

        ops.updateTweets.shift();
        ops.updatesList.sort(function(a,b) { return (a.UT > b.UT) ? 1 : ((b.UT > a.UT) ? -1 : 0); });
      }
      break;
  }
}

// Handle a social post arriving as a live update
function socialUpdate(updateObj) {

  // Don't add if the feed is still loading - displayTweets will handle it on finish
  if (SocialDisplay.config.isLoaded) {

    // Add to the visible feed if it belongs to the currently shown collection
    if (updateObj.data.collections.includes(ops.twitterSource)) SocialDisplay.addTweet(updateObj.data);

    // Otherwise switch to the relevant timeline if it belongs to the active vessel or crew
    else if (ops.pageType == "vessel" && ops.currentVessel && ops.currentVessel.Catalog.Timeline && updateObj.data.collections.includes(ops.currentVessel.Catalog.Timeline)) {
      swapTwitterSource("Mission Feed", ops.currentVessel.Catalog.Timeline, true);
    }
    else if (ops.pageType == "crew" && ops.currentCrew && ops.currentCrew.Background.Timeline && updateObj.data.collections.includes(ops.currentCrew.Background.Timeline)) {
      swapTwitterSource("Crew Feed", ops.currentCrew.Background.Timeline, true);
    }
  }
  processTweetUpdates(3);
}
