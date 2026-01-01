/**
 * Tweet Display System
 * Adapted from WordPress PHP tweet-loader to work with ASP/JavaScript environment
 * Displays custom Twitter/X collections from local archive data
 */

var TweetDisplay = (function() {
  'use strict';

  var config = {
    tweetsPath: 'http://www.kerbalspace.agency/KSA/wp-content/plugins/tweet-loader/tweets/',
    profileImage: 'https://pbs.twimg.com/profile_images/1064251777845850112/SPkeEIWH_400x400.jpg',
    accountHandle: 'KSA_MissionCtrl',
    accountName: 'Kerbal Space Agency',
    defaultMaxTweets: 0, // 0 = all tweets
    defaultOrder: 'desc' // 'asc' or 'desc'
  };

  var currentLightbox = {
    tweetId: null,
    images: [],
    index: 0
  };

  var engageIds = [];
  var requestCounter = 0;
  var activeRequests = {};

  // Helper: Parse Twitter date format to JavaScript Date
  // Twitter format: "Wed Oct 10 20:19:24 +0000 2018"
  function parseTwitterDate(dateString) {
    if (!dateString) return new Date();
    
    // Try standard Date parsing first
    var standardDate = new Date(dateString);
    if (!isNaN(standardDate.getTime())) {
      return standardDate;
    }
    
    // Parse Twitter's specific format: "Wed Oct 10 20:19:24 +0000 2018"
    var parts = dateString.split(' ');
    if (parts.length >= 6) {
      // Reconstruct in ISO format: "2018-10-10T20:19:24+00:00"
      var month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(parts[1]) + 1;
      var day = parts[2];
      var time = parts[3];
      var year = parts[5];
      var timezone = parts[4];
      
      // Build ISO string
      var isoString = year + '-' + 
                      String(month).padStart(2, '0') + '-' + 
                      String(day).padStart(2, '0') + 'T' + 
                      time + timezone.substring(0, 3) + ':' + timezone.substring(3);
      
      return new Date(isoString);
    }
    
    // Fallback to current date if parsing fails
    console.warn('Could not parse date:', dateString);
    return new Date();
  }

  // Helper: Load text file
  function loadTextFile(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
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

  // Helper: Load JSON file line by line (tweets.txt format - .json has MIME type issues on server)
  function loadTweetsJson(tweetIds, callback) {
    var url = config.tweetsPath + 'tweets.json.txt';
    loadTextFile(url, function(err, data) {
      if (err) {
        callback(err, null);
        return;
      }

      var tweetsData = {};
      tweetIds.forEach(function(id) {
        tweetsData[id] = {
          id: id,
          text: '',
          created_at: '',
          media: [],
          urls: [],
          reply_count: 0,
          retweet_count: 0,
          favorite_count: 0,
          retweeted: false,
          favorited: false
        };
      });

      var lines = data.split('\n');
      var buffer = '';
      var insideObject = false;
      var insideSubobj = false;
      var foundCount = 0;
      var foundIds = [];

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var trimmed = line.trim();

        // Start of JSON object
        if (trimmed.indexOf('{') === 0 && !insideObject) {
          insideObject = true;
          buffer = '';
        }

        // Start of sub-object
        if (trimmed.indexOf('[') !== -1 && trimmed.indexOf(']') === -1 && insideObject) {
          insideSubobj = true;
        }

        // End of sub-object
        if (trimmed.indexOf(']') !== -1 && insideSubobj) {
          insideSubobj = false;
        }

        // End of JSON object
        if (!insideSubobj && insideObject && (trimmed === '},' || trimmed === '}]')) {
          buffer += '}';
          try {
            var jsonObj = JSON.parse(buffer);
            if (tweetIds.indexOf(jsonObj.id) !== -1) {
              tweetsData[jsonObj.id] = {
                id: jsonObj.id,
                text: jsonObj.text || '',
                created_at: jsonObj.created_at || '',
                media: jsonObj.media || [],
                urls: jsonObj.urls || [],
                reply_count: jsonObj.reply_count || 0,
                retweet_count: jsonObj.retweet_count || 0,
                favorite_count: jsonObj.favorite_count || 0,
                retweeted: jsonObj.retweeted || false,
                favorited: jsonObj.favorited || false
              };
              foundIds.push(jsonObj.id);
              foundCount++;
              // Don't break early - continue searching through entire file
              // to ensure we find all requested tweets regardless of their position
            }
          } catch (e) {
            console.error('JSON Parse Error:', e, buffer);
          }
          insideObject = false;
        } else {
          buffer += line;
        }
      }

      // Find missing tweets
      var missingIds = tweetIds.filter(function(id) {
        return foundIds.indexOf(id) === -1;
      });
      if (missingIds.length > 0) {
        console.warn('[Tweet Loader] Missing ' + missingIds.length + ' tweets:', missingIds);
      }

      callback(null, tweetsData);
    });
  }

  // Helper: Format tweet HTML
  function formatTweet(tweet, isDateBoundary, order) {
    var mediaHtml = '';
    var tweetText = tweet.text;

    // Replace URLs with links
    if (tweet.urls && tweet.urls.length > 0) {
      tweet.urls.forEach(function(url) {
        var link = '<a href="' + escapeHtml(url.expanded_url) + '" target="_blank">' + escapeHtml(url.display_url) + '</a>';
        tweetText = tweetText.split(url.url).join(link);
      });
    }

    // Process media
    if (tweet.media && tweet.media.length > 0) {
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
          var fullUrl = mediaUrl;
          
          // For Twitter images, request high quality
          if (media.type !== 'custom') {
            fullUrl = mediaUrl.replace(/\.\w+$/, '') + '?format=png&name=large';
          } else {
            fullUrl = media.url || mediaUrl;
          }
          
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
      
      // Remove media URL from tweet text
      if (firstMedia.url) {
        tweetText = tweetText.split(firstMedia.url).join('');
      }
    }

    // Remove self-mentions
    tweetText = tweetText.split('@' + config.accountHandle).join('');
    
    // Replace @handles with links
    tweetText = tweetText.replace(/@(\w+)/g, '<a href="https://x.com/$1" target="_blank">@$1</a>');

    // Replace consecutive spaces with non-breaking spaces
    tweetText = tweetText.replace(/  +/g, function(match) {
      return '&nbsp;'.repeat(match.length);
    });

    // Replace newlines with <br>
    tweetText = tweetText.replace(/\n/g, '<br>');

    // Format timestamp to Eastern Time
    var date = parseTwitterDate(tweet.created_at);
    var estOptions = { 
      timeZone: 'America/New_York',
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
      year: 'numeric'
    };
    var timestamp = date.toLocaleString('en-US', estOptions);

    // Date boundary classes
    var dateBoundaryClass = isDateBoundary ? ' date-boundary' : '';
    if (isDateBoundary && order === 'desc') {
      dateBoundaryClass += ' desc-order';
    }

    // Handle display
    var handleHtml = '<span class="tweet-handle">@' + config.accountHandle + '</span>';
    
    // Conversation link
    var conversationLink = '';
    if (engageIds.indexOf(tweet.id) !== -1) {
      conversationLink = '<a class="tweet-action" href="https://x.com/' + config.accountHandle + '/status/' + tweet.id + '" target="_blank"><span>💬</span> View Conversation</a>';
    }

    var html = '<div class="tweet' + dateBoundaryClass + '" id="tweet-' + tweet.id + '">';
    html += '<a name="' + tweet.id + '"></a>';
    html += '<img class="tweet-profile-img" src="' + config.profileImage + '" alt="Profile picture">';
    html += '<div class="tweet-content">';
    html += '<div class="tweet-header">';
    html += '<span class="tweet-name"><a href="https://x.com/' + config.accountHandle + '" target="_blank">' + config.accountName + '</a></span>';
    html += handleHtml;
    html += '</div>';
    html += '<div class="tweet-text">' + tweetText + '</div>';
    html += mediaHtml;
    html += '<p class="full-timestamp"><a href="https://x.com/' + config.accountHandle + '/status/' + tweet.id + '" target="_blank">' + timestamp + '</a></p>';
    html += '<div class="tweet-actions">';
    html += '<div class="tweet-action' + (tweet.retweet_count > 0 ? '' : ' zero') + '"><span>🔄</span> ' + tweet.retweet_count + '</div>';
    html += '<div class="tweet-action' + (tweet.favorite_count > 0 ? '' : ' zero') + '"><span>❤️</span> ' + tweet.favorite_count + '</div>';
    html += conversationLink;
    html += '</div>';
    html += '</div>';
    html += '</div>';

    return html;
  }

  // Helper: Escape HTML
  function escapeHtml(text) {
    if (!text) return '';
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  // Display tweets in container
  function displayTweets(options) {
    var containerEl = document.getElementById(options.containerId);
    if (!containerEl) {
      console.error('Tweet container not found:', options.containerId);
      return;
    }

    var collectionFile = options.collectionFile || 'main';
    var order = options.order || config.defaultOrder;
    var maxTweets = options.maxTweets || config.defaultMaxTweets;

    // Generate unique request ID and cancel any previous requests for this container
    var requestId = ++requestCounter;
    activeRequests[options.containerId] = requestId;

    containerEl.innerHTML = '<div class="tweet-loading">Loading tweets...</div>';

    // Load tweet IDs
    loadTextFile(config.tweetsPath + collectionFile + '.txt', function(err, data) {
      // Check if this request is still active
      if (activeRequests[options.containerId] !== requestId) {
        console.log('Tweet request cancelled (superseded by newer request)');
        return;
      }

      if (err) {
        containerEl.innerHTML = '<p class="tweet-error">No tweets found.</p>';
        return;
      }

      var tweetIds = data.split('\n')
        .map(function(line) { return line.trim(); })
        .filter(function(line) { return line.length > 0; });

      // Remove duplicates
      tweetIds = tweetIds.filter(function(item, pos) {
        return tweetIds.indexOf(item) === pos;
      });

      // Sort
      if (order === 'desc') {
        tweetIds.sort(function(a, b) { return Number(b) - Number(a); });
      } else {
        tweetIds.sort(function(a, b) { return Number(a) - Number(b); });
      }

      // Track total before limiting
      var totalTweets = tweetIds.length;

      // Limit
      if (maxTweets > 0) {
        tweetIds = tweetIds.slice(0, maxTweets);
      }

      // Load engage list
      loadTextFile(config.tweetsPath + 'engage.txt', function(engageErr, engageData) {
        // Check if this request is still active
        if (activeRequests[options.containerId] !== requestId) {
          console.log('Tweet request cancelled (superseded by newer request)');
          return;
        }

        if (!engageErr && engageData) {
          engageIds = engageData.split('\n')
            .map(function(line) { return line.trim(); })
            .filter(function(line) { return line.length > 0; });
        }

        // Load tweets data
        loadTweetsJson(tweetIds, function(tweetsErr, tweetsData) {
          // Check if this request is still active
          if (activeRequests[options.containerId] !== requestId) {
            console.log('Tweet request cancelled (superseded by newer request)');
            return;
          }

          if (tweetsErr) {
            containerEl.innerHTML = '<p class="tweet-error">Failed to load tweets.</p>';
            console.error(tweetsErr);
            return;
          }

          // Sort tweets data by order
          var tweetsArray = tweetIds.map(function(id) { return tweetsData[id]; });

          // Render tweets with inline styling
          var html = '<div id="tweet-container" class="inline-tweets" data-order="' + order + '" data-collection="' + collectionFile + '">';

          for (var i = 0; i < tweetsArray.length; i++) {
            var tweet = tweetsArray[i];
            var isDateBoundary = false;

            // Check for date boundary
            if (i > 0 || i < tweetsArray.length - 1) {
              var currentDate = parseTwitterDate(tweet.created_at);
              var currentDay = currentDate.toISOString().split('T')[0];

              if (order === 'desc' && i > 0) {
                var prevDate = parseTwitterDate(tweetsArray[i - 1].created_at);
                var prevDay = prevDate.toISOString().split('T')[0];
                isDateBoundary = (currentDay !== prevDay);
              } else if (order === 'asc' && i < tweetsArray.length - 1) {
                var nextDate = parseTwitterDate(tweetsArray[i + 1].created_at);
                var nextDay = nextDate.toISOString().split('T')[0];
                isDateBoundary = (currentDay !== nextDay);
              }
            }

            html += formatTweet(tweet, isDateBoundary, order);
          }

          // Only show "View Full Collection" link if tweets were limited
          if (maxTweets > 0 && totalTweets > maxTweets) {
            html += '<div style="text-align: center; padding: 5px 0;">';
            html += '<a href="http://www.kerbalspace.agency/?p=' + collectionFile + '" target="_blank" style="font-size: 16px; color: #1da1f2; text-decoration: none; font-weight: 500;">View Full Collection →</a>';
            html += '</div>';
          }

          html += '</div>';
          containerEl.innerHTML = html;

          // Initialize lightbox
          initializeLightbox();
        });
      });
    });
  }

  // Initialize lightbox
  function initializeLightbox() {
    var lightbox = document.getElementById('tweet-lightbox');
    if (!lightbox) {
      // Create lightbox if it doesn't exist
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
      if (currentLightbox.index < currentLightbox.images.length - 1) {
        showImage(currentLightbox.index + 1);
      } else {
        showImage(0);
      }
    }

    function prevImage() {
      if (currentLightbox.index > 0) {
        showImage(currentLightbox.index - 1);
      } else {
        showImage(currentLightbox.images.length - 1);
      }
    }

    // Event listeners
    document.querySelectorAll('.lightbox-trigger').forEach(function(trigger) {
      trigger.addEventListener('click', function(e) {
        e.preventDefault();
        var tweetId = this.getAttribute('data-tweet-id');
        var imageIndex = parseInt(this.getAttribute('data-image-index'), 10);
        openLightbox(tweetId, imageIndex);
      });
    });

    if (closeBtn) closeBtn.onclick = closeLightbox;
    if (lightbox) {
      lightbox.onclick = function(e) {
        if (e.target === lightbox) closeLightbox();
      };
    }
    if (prevBtn) prevBtn.onclick = function(e) {
      e.stopPropagation();
      prevImage();
    };
    if (nextBtn) nextBtn.onclick = function(e) {
      e.stopPropagation();
      nextImage();
    };

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
      if (lightbox.style.display === 'flex') {
        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowRight') nextImage();
        else if (e.key === 'ArrowLeft') prevImage();
      }
    });
  }

  // Public API
  return {
    displayTweets: displayTweets,
    config: config
  };
})();
