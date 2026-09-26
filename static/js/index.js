window.HELP_IMPROVE_VIDEOJS = false;

// Interpolation slider: frames are INTERP_BASE/000000.jpg ... (NUM_INTERP_FRAMES - 1).
// Leave NUM_INTERP_FRAMES at 0 to disable.
var INTERP_BASE = "./static/interpolation/stacked";
var NUM_INTERP_FRAMES = 0;

var interp_images = [];

// Real-world comparison viewer. Clips of one task are start-aligned, so they
// play as a group: all start together once buffered, each holds its last
// frame, and the group restarts together after the longest clip ends.
function startTogether(panel) {
  var videos = $(panel).find('video').get();
  var token = {};
  $(panel).data('playToken', token);
  videos.forEach(function(v) {
    v.pause();
    v.currentTime = 0;
    if (v.preload === 'none') { v.preload = 'auto'; v.load(); }
  });
  var waitUntilReady = function() {
    if ($(panel).data('playToken') !== token) { return; }
    // Paused videos only buffer the current frame, so wait for each seek to
    // finish (HAVE_CURRENT_DATA) rather than for data ahead of it.
    if (videos.every(function(v) { return !v.seeking && v.readyState >= 2; })) {
      videos.forEach(function(v) {
        var promise = v.play();
        if (promise !== undefined) { promise.catch(function() {}); }
      });
    } else {
      setTimeout(waitUntilReady, 100);
    }
  };
  waitUntilReady();
}

// Keep playing clips in step: if one falls behind (e.g. while buffering),
// move it to the time of the clip furthest along.
function correctDrift(panel) {
  var playing = $(panel).find('video').get().filter(function(v) {
    return !v.paused && !v.ended;
  });
  if (playing.length < 2) { return; }
  var lead = Math.max.apply(null, playing.map(function(v) { return v.currentTime; }));
  playing.forEach(function(v) {
    if (lead - v.currentTime > 0.3 && lead < v.duration) { v.currentTime = lead; }
  });
}

function stopPanel(panel) {
  $(panel).data('playToken', null);
  $(panel).find('video').each(function() { this.pause(); });
}

function showTask(task) {
  $('.task-tab').removeClass('is-active');
  $('.task-tab[data-task="' + task + '"]').addClass('is-active');
  $('.task-panel').each(function() {
    var active = $(this).data('task') === task;
    $(this).toggleClass('is-hidden', !active);
    if (active) {
      startTogether(this);
    } else {
      stopPanel(this);
    }
  });
}

function preloadInterpolationImages() {
  for (var i = 0; i < NUM_INTERP_FRAMES; i++) {
    var path = INTERP_BASE + '/' + String(i).padStart(6, '0') + '.jpg';
    interp_images[i] = new Image();
    interp_images[i].src = path;
  }
}

function setInterpolationImage(i) {
  var image = interp_images[i];
  image.ondragstart = function() { return false; };
  image.oncontextmenu = function() { return false; };
  $('#interpolation-image-wrapper').empty().append(image);
}


$(document).ready(function() {
    // Check for click events on the navbar burger icon
    $(".navbar-burger").click(function() {
      // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
      $(".navbar-burger").toggleClass("is-active");
      $(".navbar-menu").toggleClass("is-active");

    });

    $('.task-tab').click(function() {
      showTask($(this).data('task'));
    });
    $('#restart-videos').click(function() {
      startTogether($('.task-panel').not('.is-hidden'));
    });
    $('.task-panel video').on('ended', function() {
      var panel = $(this).closest('.task-panel');
      if (panel.find('video').get().every(function(v) { return v.ended; })) {
        startTogether(panel);
      }
    });
    setInterval(function() {
      correctDrift($('.task-panel').not('.is-hidden'));
    }, 1000);
    // Start the first task once the viewer scrolls into view.
    var firstPanel = $('.task-panel').not('.is-hidden').get(0);
    if (firstPanel && 'IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          startTogether(firstPanel);
        }
      }, {threshold: 0.25});
      observer.observe(firstPanel);
    } else if (firstPanel) {
      startTogether(firstPanel);
    }

    var options = {
			slidesToScroll: 1,
			slidesToShow: 3,
			loop: true,
			infinite: true,
			autoplay: false,
			autoplaySpeed: 3000,
    }

		// Initialize all div with carousel class
    bulmaCarousel.attach('.carousel', options);

    if (NUM_INTERP_FRAMES > 0 && $('#interpolation-slider').length) {
      preloadInterpolationImages();

      $('#interpolation-slider').on('input', function(event) {
        setInterpolationImage(this.value);
      });
      setInterpolationImage(0);
      $('#interpolation-slider').prop('max', NUM_INTERP_FRAMES - 1);
    }

    bulmaSlider.attach();

})
