(function ($) {
    "use strict";
    
    // Dropdown on mouse hover
    $(document).ready(function () {
        function toggleNavbarMethod() {
            if ($(window).width() > 992) {
                $('.navbar .dropdown').on('mouseover', function () {
                    $('.dropdown-toggle', this).trigger('click');
                }).on('mouseout', function () {
                    $('.dropdown-toggle', this).trigger('click').blur();
                });
            } else {
                $('.navbar .dropdown').off('mouseover').off('mouseout');
            }
        }
        toggleNavbarMethod();
        $(window).resize(toggleNavbarMethod);
    });


    // Date and time picker
    $('.date').datetimepicker({
        format: 'L'
    });
    $('.time').datetimepicker({
        format: 'LT'
    });
    
    
    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 100) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });


    // Portfolio isotope and filter
    var portfolioIsotope = $('.portfolio-container').isotope({
        itemSelector: '.portfolio-item',
        layoutMode: 'fitRows'
    });
    $('#portfolio-flters li').on('click', function () {
        $("#portfolio-flters li").removeClass('active');
        $(this).addClass('active');

        portfolioIsotope.isotope({filter: $(this).data('filter')});
    });


    // Testimonials carousel
    $(".testimonial-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 1000,
        items: 1,
        dots: false,
        loop: true,
    });
    
})(jQuery);

// Feedback Form Validation
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('feedbackForm');
    const submitBtn = document.getElementById('submitBtn');
    const formMessages = document.getElementById('form-messages');
    
    // Phone number validation pattern
    const phonePattern = /^[0-9]{10,15}$/;
    
    // Email validation pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Reset validation states
        form.classList.remove('was-validated');
        const inputs = form.querySelectorAll('.form-control, .form-check-input');
        inputs.forEach(input => {
            input.classList.remove('is-invalid');
        });
        
        // Validate form
        let isValid = true;
        
        // Name validation
        const nameInput = document.getElementById('name');
        if (!nameInput.value.trim()) {
            nameInput.classList.add('is-invalid');
            isValid = false;
        }
        
        // Email validation
        const emailInput = document.getElementById('email');
        if (!emailPattern.test(emailInput.value)) {
            emailInput.classList.add('is-invalid');
            isValid = false;
        }
        
        // Phone validation (optional but must be valid if provided)
        const phoneInput = document.getElementById('phone');
        if (phoneInput.value && !phonePattern.test(phoneInput.value)) {
            phoneInput.classList.add('is-invalid');
            isValid = false;
        }
        
        // Subject validation
        const subjectInput = document.getElementById('subject');
        if (!subjectInput.value) {
            subjectInput.classList.add('is-invalid');
            isValid = false;
        }
        
        // Message validation
        const messageInput = document.getElementById('message');
        if (!messageInput.value.trim()) {
            messageInput.classList.add('is-invalid');
            isValid = false;
        }
        
        // Consent validation
        const consentInput = document.getElementById('consent');
        if (!consentInput.checked) {
            consentInput.classList.add('is-invalid');
            isValid = false;
        }
        
        if (isValid) {
            // Disable submit button to prevent multiple submissions
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
            
            // Submit form via AJAX
            const formData = new FormData(form);
            
            fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Show success message
                    formMessages.classList.remove('alert-danger', 'd-none');
                    formMessages.classList.add('alert-success');
                    formMessages.textContent = 'Thank you! Your feedback has been submitted successfully.';
                    
                    // Reset form
                    form.reset();
                } else {
                    // Show error message
                    formMessages.classList.remove('alert-success', 'd-none');
                    formMessages.classList.add('alert-danger');
                    formMessages.textContent = data.message || 'There was a problem submitting your feedback. Please try again.';
                }
            })
            .catch(error => {
                // Show error message
                formMessages.classList.remove('alert-success', 'd-none');
                formMessages.classList.add('alert-danger');
                formMessages.textContent = 'There was a problem submitting your feedback. Please try again.';
                console.error('Error:', error);
            })
            .finally(() => {
                // Re-enable submit button
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Submit';
                
                // Scroll to message
                formMessages.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        } else {
            // Show validation errors
            form.classList.add('was-validated');
        }
    });
    
    // Real-time validation for phone number
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', function() {
        if (this.value && !phonePattern.test(this.value)) {
            this.classList.add('is-invalid');
        } else {
            this.classList.remove('is-invalid');
        }
    });
    
    // Real-time validation for email
    const emailInput = document.getElementById('email');
    emailInput.addEventListener('input', function() {
        if (!emailPattern.test(this.value)) {
            this.classList.add('is-invalid');
        } else {
            this.classList.remove('is-invalid');
        }
    });
});