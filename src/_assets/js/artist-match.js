(function () {
  var LANG = document.documentElement.lang === 'en' ? 'en' : 'da';

  var ARTISTS = [
    {
      slug: 'jonas', name: 'Jonas Bek', booksysId: 4,
      style: { 'bold-klassisk': 3, 'farverig': 3, 'sort-praecis': 0, 'delikat-fin': 0 },
      size:  { 'lille': 0, 'medium': 1, 'stort': 3 }
    },
    {
      slug: 'liv', name: 'Liv Sørensen', booksysId: 5,
      style: { 'bold-klassisk': 0, 'farverig': 2, 'sort-praecis': 3, 'delikat-fin': 0 },
      size:  { 'lille': 0, 'medium': 2, 'stort': 3 }
    },
    {
      slug: 'maja', name: 'Maja Holm', booksysId: 3,
      style: { 'bold-klassisk': 0, 'farverig': 0, 'sort-praecis': 1, 'delikat-fin': 3 },
      size:  { 'lille': 3, 'medium': 2, 'stort': 0 }
    },
    {
      slug: 'nizar', name: 'Nizar Saad', booksysId: 2,
      style: { 'bold-klassisk': 3, 'farverig': 0, 'sort-praecis': 2, 'delikat-fin': 0 },
      size:  { 'lille': 0, 'medium': 1, 'stort': 3 }
    },
    {
      slug: 'simone', name: 'Simone Chimere', booksysId: 1,
      style: { 'bold-klassisk': 1, 'farverig': 0, 'sort-praecis': 2, 'delikat-fin': 2 },
      size:  { 'lille': 2, 'medium': 2, 'stort': 1 }
    }
  ];

  var PRICES = {
    da: { 'lille': 'Fra 800 kr', 'medium': '1.500 – 3.000 kr', 'stort': '3.000+ kr' },
    en: { 'lille': 'From DKK 800', 'medium': 'DKK 1,500 – 3,000', 'stort': 'DKK 3,000+' }
  };

  var styleChoice = null, sizeChoice = null, budgetChoice = null;

  function totalScore(a) {
    return (a.style[styleChoice] || 0) + (a.size[sizeChoice] || 0);
  }

  function bestMatch() {
    return ARTISTS.reduce(function (best, a) {
      var aScore = totalScore(a), bScore = totalScore(best);
      if (aScore > bScore) return a;
      if (aScore === bScore && (a.style[styleChoice] || 0) > (best.style[styleChoice] || 0)) return a;
      return best;
    });
  }

  function showResult() {
    var artist = bestMatch();
    var artistBase = LANG === 'en' ? '/en/artists/' : '/artister/';
    var artistUrl  = artistBase + artist.slug + '/';
    var bookingUrl = 'https://inkart.book.dk/?artist=' + artist.booksysId;
    var price      = PRICES[LANG][sizeChoice];
    var budgetTight = budgetChoice === 'under-1000' && sizeChoice !== 'lille';

    document.getElementById('match-artist-name').textContent = artist.name;
    document.getElementById('match-price').textContent       = price;
    document.getElementById('match-artist-link').href        = artistUrl;
    document.getElementById('match-book-link').href          = bookingUrl;

    var note = document.getElementById('match-budget-note');
    if (note) note.hidden = !budgetTight;

    document.getElementById('match-steps').hidden  = true;
    document.getElementById('match-result').hidden = false;
  }

  function init() {
    var steps  = document.getElementById('match-steps');
    var step1  = document.getElementById('step-1');
    var step2  = document.getElementById('step-2');
    var step3  = document.getElementById('step-3');
    var result = document.getElementById('match-result');
    var nojs   = document.getElementById('match-nojs');

    if (!steps) return;

    if (nojs) nojs.hidden = true;

    steps.hidden = false;
    step2.hidden = true;
    step3.hidden = true;
    result.hidden = true;

    steps.addEventListener('click', function (e) {
      var btn  = e.target.closest('[data-value]');
      if (!btn) return;
      var step = btn.closest('[data-step]');
      if (!step) return;

      step.querySelectorAll('[data-value]').forEach(function (b) {
        b.removeAttribute('aria-pressed');
      });
      btn.setAttribute('aria-pressed', 'true');

      var val    = btn.dataset.value;
      var stepId = step.dataset.step;

      if (stepId === '1') {
        styleChoice  = val;
        step1.hidden = true;
        step2.hidden = false;
      } else if (stepId === '2') {
        sizeChoice   = val;
        step2.hidden = true;
        step3.hidden = false;
      } else if (stepId === '3') {
        budgetChoice = val;
        showResult();
      }
    });

    var resetBtn = document.getElementById('match-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        styleChoice = null; sizeChoice = null; budgetChoice = null;
        steps.querySelectorAll('[aria-pressed]').forEach(function (b) {
          b.removeAttribute('aria-pressed');
        });
        result.hidden = true;
        steps.hidden  = false;
        step1.hidden  = false;
        step2.hidden  = true;
        step3.hidden  = true;
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
