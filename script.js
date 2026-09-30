// Scroll reveal
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries)=>{
	entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
},{threshold:0.15});
revealEls.forEach(el=>io.observe(el));

// Policy X-Ray highlighter trigger
const xrayDoc = document.getElementById('xrayDoc');
const io2 = new IntersectionObserver((entries)=>{
	entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io2.unobserve(e.target); } });
},{threshold:0.4});
if(xrayDoc) io2.observe(xrayDoc);

// Fake form submit
const form = document.getElementById('leadForm');
if(form){
	// Prefer reading endpoint from form.action (set in HTML). Fallback to placeholder.
	const FORM_ENDPOINT = form.action || 'https://formspree.io/f/your_form_id'; // replace with your endpoint
	if(!form.action) console.warn('Form `action` not set — edit <form id="leadForm" action="https://formspree.io/f/your_form_id">');

	form.addEventListener('submit', async function(e){
		e.preventDefault();

		const formCard = document.querySelector('.form-card');
		// Apply visual 'submitting' state (form goes black)
		if(formCard) formCard.classList.add('submitting');

		const formView = document.getElementById('formView');
		const thanksView = document.getElementById('thanksView');

		// Collect form data including file
		const data = new FormData(form);

		try{
			const resp = await fetch(FORM_ENDPOINT, {
				method: 'POST',
				body: data,
				headers: { 'Accept': 'application/json' }
			});

			if(resp.ok){
				if(formView) formView.style.display = 'none';
				if(thanksView) thanksView.classList.add('show');
			} else {
				// on failure, revert visual and show simple alert
				if(formCard) formCard.classList.remove('submitting');
				const text = await resp.text();
				console.error('Form submission error', resp.status, text);
				alert('Houve um erro ao enviar o formulário. Tente novamente mais tarde.');
			}
		}catch(err){
			if(formCard) formCard.classList.remove('submitting');
			console.error('Form submission exception', err);
			alert('Não foi possível enviar o formulário. Verifique sua conexão.');
		}
	});
}
