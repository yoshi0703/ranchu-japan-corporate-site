(() => {
  const forms = document.querySelectorAll('.js-contact-form');

  forms.forEach((form) => {
    const statusEl = form.querySelector('.form-status');
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!submitBtn) return;

      const formData = new FormData(form);
      const payload = {
        name: formData.get('name'),
        organization: formData.get('organization'),
        email: formData.get('email'),
        inquiryType: formData.get('inquiryType'),
        message: formData.get('message'),
        privacyConsent: formData.get('privacyConsent'),
        website: formData.get('website')
      };

      submitBtn.disabled = true;
      const originalText = submitBtn.textContent;
      submitBtn.textContent = '送信中...';

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok || !result.ok) {
          const errorText = result.details?.length ? result.details.join(' / ') : (result.error || '送信に失敗しました。');
          if (statusEl) {
            statusEl.className = 'form-status error';
            statusEl.textContent = `送信できませんでした: ${errorText}`;
          }
          return;
        }

        window.location.href = '/thank-you/';
      } catch (error) {
        if (statusEl) {
          statusEl.className = 'form-status error';
          statusEl.textContent = '通信に失敗しました。時間をおいて再度お試しください。';
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText || '送信する';
      }
    });
  });
})();
