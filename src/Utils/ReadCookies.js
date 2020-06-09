const ReadCookies = ()=> {
  let browserCookies = document.cookie
  .split(';')
  .map(cookie => cookie.split('='))
  .reduce((accumulator, [key, value]) => (
    { ...accumulator, [key.trim()]: decodeURIComponent(value) }
  ), {})

  return browserCookies
}

export default ReadCookies 
