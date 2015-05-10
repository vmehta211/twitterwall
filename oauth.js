var ids = {
facebook: {
 clientID: '876803112345312',
 clientSecret: '41083d8bcc6fe21b575c587b98245276',
 callbackURL: 'http://11.0.0.1:3000/auth/facebook/callback'
},
twitter: {
 consumerKey: 'O0t7RV0ifxnhVNpwZBIMX0SKY',
 consumerSecret: 'fMFAjk2MErpybiEiPSduDZkDVlNXthavw8MaKzUBH7EoVuPKgd',
 accessToken: '2493415579-PykRmaRM60OheHU2GugdIOlgFZ2OIYSPGLvKNGr',
 accessTokenSecret: 'Nh52OLHkli4E94SObJ5QGvynp3xLlKwO3STHp6LTg7HnU',
 callbackURL: "http://11.0.0.1:3000/auth/twitter/callback"
},
github: {
 clientID: 'get_your_own',
 clientSecret: 'get_your_own',
 callbackURL: "http://127.0.0.1:1337/auth/github/callback"
},
google: {
 returnURL: 'http://127.0.0.1:1337/auth/google/callback',
 realm: 'http://127.0.0.1:1337'
}
}

module.exports = ids
