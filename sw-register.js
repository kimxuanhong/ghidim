<!-- Service Worker Registration  -->
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/ghidim/sw.js')
        .then(reg => console.log('Service Worker registered with scope:', reg.scope))
        .catch(err => console.error('Service Worker registration failed:', err));
}
