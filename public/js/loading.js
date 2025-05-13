const slug = window.slug;
if (!slug) {
    window.location.href = "/";
} else {
    setTimeout(() => {
        window.location.href = '/' + slug + '/card';
    }, 5000);
} 