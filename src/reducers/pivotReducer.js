import ReadCookies from '../Utils/ReadCookies'
import firebase from '../Utils/Firebase'
import moment from 'moment'
const sessionStart = moment()

const initialPivotState = {
  loading: true,
  fetchError: false,
  loadingMsg: 'Loading...',
  data:{
    qbo:null,
    payroll:null,
  },
  page:1,
  timeline: null,
  activeCountries:['UK'],
  activeTeams: ['Galahad','Excalibur','Bedivere','Pendragon','Lancelot','Platform','DevOps'],
  emptyCountries: false,
  fullCountries: false,
  emptyTeams: false,
  fullTeams: false,
  displayProjectsBy: 'teams',
  displayMore: true,
  showDetail: false,
  currentProject: null,
  height: window.innerHeight,
  overlap:{qbo:[],payroll:[]},
  noSelect:false,
  range:{
    interactionCount:0,
    projectTranslate: 0,
    projectLeft: 0,
    zoom: 200,
    start:0,
    end:50,
    startDown:false,
    endDown:false,
    offsetDown:false,
    rangeMove:false,
    offsetStart: 0,
    oldPos: 0,
    offset: 0
  },
  search:{
    searchFocus:false,
    searchIsChanging:false,
    matchedProjects:[],
    stringToMatch:'',
    filteredProjects:[]
  },
  rate:{selected:null},
  currentSession: null,
  cookies:{
    id:null,
    interactions: {},
    orderOfInteractions:[]
  },
  askForCookies: false,
  cookiesAccepted: false,
  lastInteraction: sessionStart,
  devMode:false,
  pristine:true,
  idle:false,
  idleTimeout: 240000,
  onBoarding: {
    show: ReadCookies().hasOwnProperty('onboarded') === false,
    showIt:false,
    steps:['roadmap','timeline','filters','search','about'],
    current: -1
  }
}



const onVide = (tempState,which)=> {
  if (which === 'teams') {
    tempState.emptyTeams = true
    tempState.fullTeams = false
    tempState.activeTeams = []
  } else {
    tempState.emptyCountries = true
    tempState.fullCountries = false
    tempState.activeCountries = []
  }
}
const onRempli = (tempState,which) => {
  if (which === 'teams') {
    tempState.fullTeams = true
    tempState.emptyTeams = false
    tempState.activeTeams = [...tempState.timeline.filters.pms].map(pm=>{
      switch (pm) {
        case 'Jonathan Valentine': return 'Bedivere';break;
        case 'KK Aoki Izu': return 'Excalibur';break;
        case 'Madeline Guyette': return 'Galahad';break;
        default: return pm
      }
    })
  } else {
    tempState.fullCountries = true
    tempState.emptyCountries = false
    tempState.activeCountries = [...tempState.timeline.filters.countries]
  }
}


const filterList = (filterWhat,tempState,tempAction)=> {
  let targetRef
  let activeTarget
  const {
    activeTeams,timeline,
    activeCountries } = tempState
  switch (filterWhat) {
    case 'teams':
    activeTarget = activeTeams
    targetRef = timeline.filters.pms; break;
    case 'countries':
    activeTarget = activeCountries
    targetRef = timeline.filters.countries; break;
    default: return null
  }

  const { payload  } = tempAction
  let target = activeTarget.indexOf(payload)
  if (target !== -1) {
    activeTarget.splice(target,1)
  } else {
      activeTarget.push(payload)
  }

  let emptyTarget
  let fullTarget

  if (activeTarget.length === 0) {
    emptyTarget = true
  } else {
    emptyTarget = false
  }

  if (activeTarget.length === targetRef.length) {
    fullTarget = true
  } else {
    fullTarget = false
  }

  switch (filterWhat) {
    case 'teams':
      tempState.emptyTeams = emptyTarget
      tempState.fullTeams = fullTarget;  break;

    case 'countries':
      tempState.emptyCountries = emptyTarget
      tempState.fullCountries = fullTarget;  break;
    default: return null
  }
  return tempState
}

const displayAllFilters = (tempState,which) => {
  if (which === 'teams') {
    if (tempState.emptyTeams) {
      //si c'est vide on rempli
      onRempli(tempState,which)
    } else {
      //si c'est pas vide :
      if (tempState.activeTeams === tempState.timeline.filters.pms) {
        //si c'est plein on vide :
        onVide(tempState,which)
      } else {
        //Si c'est ni vide ni plein on rempli
        onRempli(tempState,which)
      }
    }
  } else {

    if (tempState.emptyCountries) {
      //si c'est vide on rempli
      onRempli(tempState,which)
    } else {
      //si c'est pas vide :
      if (tempState.activeCountries === tempState.timeline.filters.countries) {
        //si c'est plein on vide :
        onVide(tempState,which)
      } else {
        //Si c'est ni vide ni plein on rempli
        onRempli(tempState,which)
      }
    }
  }
  return tempState
}

const checkIdle = tempState => {
  if(tempState.pristine) {
    tempState.idle = true
    tempState = endSession(tempState)
  }
  return tempState
}

const endSession = tempState => {
  if (!tempState.devMode) {
    const sessionEnd = moment()
    const sessionDuration =  moment.duration(moment().diff(tempState.cookies.sessionStart)).asSeconds()
    const path = '/uk_users/' + tempState.cookies.userID +'/sessions/' + tempState.cookies.currentSessionKey
    firebase.database().ref().child(path + '/sessionEnd/').set(sessionEnd.format("dddd, MMMM Do YYYY, h:mm:ss a"))
    firebase.database().ref().child(path + '/sessionDurationInSeconds/').set(sessionDuration)
    firebase.database().ref().child(path + '/userInteractions/').set(tempState.cookies.interactions)
    firebase.database().ref().child(path + '/orderOfInteractions/').set(tempState.cookies.orderOfInteractions)
  }
  return tempState
}

const startANewSession = tempState => {
  const idFromCookie = ReadCookies().userID
  const newSessionKey = firebase.database().ref().child('/uk_users/').push().key
  const newRef = firebase.database().ref().child('/uk_users/' + idFromCookie +'/sessions/' + newSessionKey+ '/sessionStart/')
  if (!tempState.devMode) newRef.set(sessionStart.format("dddd, MMMM Do YYYY, h:mm:ss a"))
  tempState.cookies.userID = idFromCookie
  tempState.cookies.sessionStart = sessionStart
  tempState.cookies.currentSessionKey = newSessionKey
  return tempState
}

const closeSide = tempState => {
  if(tempState.showDetail) tempState.showDetail = false
}



const pivotReducer = (state, action) => {
  switch (action.type) {

    case 'FETCH_ERR':
      let FETCH_ERR = {...state}
      FETCH_ERR.loading = false
      FETCH_ERR.fetchError = true
    return FETCH_ERR

    case 'UPDATE_QBO':
      let UPDATE_QBO = {...state}
      const filteredData = action.payload.rows.filter(r=>r[4].plain_value.split(',').length === 1)
      UPDATE_QBO.fetchError = false
      UPDATE_QBO.loading = false
      UPDATE_QBO.loadingMsg = 'Loading...'
      UPDATE_QBO.data.qbo = filteredData
    return UPDATE_QBO

    case 'UPDATE_PAYROLL':
      let UPDATE_PAYROLL = {...state}
      UPDATE_PAYROLL.data.payroll = action.payload.rows
    return UPDATE_PAYROLL

    case 'FETCH_TIMEOUT':
      let FETCH_TIMEOUT = {...state}
      FETCH_TIMEOUT.loadingMsg = 'Check your internet bruv'
    return FETCH_TIMEOUT

    case 'UPDATE_PAGE':
      let UPDATE_PAGE = {...state}
      UPDATE_PAGE.page = action.payload
      UPDATE_PAGE.loading = true
    return UPDATE_PAGE

    case 'SET_TIMELINE':
      let SET_TIMELINE = {...state}
      SET_TIMELINE.timeline = action.payload
    return SET_TIMELINE

    case 'FILTER_COUNTRY':
      let FILTER_COUNTRY = {...state}
      let tempCountryAction = {...action}
    return filterList('countries',FILTER_COUNTRY,tempCountryAction)

    case 'FILTER_TEAM':
      let FILTER_TEAM = {...state}
      let tempTeamAction = {...action}
    return filterList('teams',FILTER_TEAM,tempTeamAction)

    case 'DISPLAY_ALL_COUNTRIES':
      let DISPLAY_ALL_COUNTRIES = {...state}
    return displayAllFilters(DISPLAY_ALL_COUNTRIES,'countries')


    case 'DISPLAY_ALL_TEAMS':
      let DISPLAY_ALL_TEAMS = {...state}
      DISPLAY_ALL_TEAMS.displayMore = false
    return displayAllFilters(DISPLAY_ALL_TEAMS,'teams')


    case 'SWITCH_DISPLAY_COUNTRY_VS_TEAM':
      let SWITCH_DISPLAY_COUNTRY_VS_TEAM = {...state}
      SWITCH_DISPLAY_COUNTRY_VS_TEAM.displayProjectsBy = action.payload
    return SWITCH_DISPLAY_COUNTRY_VS_TEAM;


    case 'DISPLAY_MORE_FILTERS':
      let DISPLAY_MORE_FILTERS = {...state}
      DISPLAY_MORE_FILTERS.displayMore = !DISPLAY_MORE_FILTERS.displayMore
    return DISPLAY_MORE_FILTERS;

    case 'DISPLAY_PROJECT_DETAIL':
      let DISPLAY_PROJECT_DETAIL = {...state}
      if (!DISPLAY_PROJECT_DETAIL.showDetail) DISPLAY_PROJECT_DETAIL.showDetail = true
      DISPLAY_PROJECT_DETAIL.currentProject = action.payload.project
      DISPLAY_PROJECT_DETAIL.timeline.projects.map(p=>{
        p.selected = false
        return p
      })
      if (!DISPLAY_PROJECT_DETAIL.timeline.projects[action.payload.idx]['selected']) {
        DISPLAY_PROJECT_DETAIL.timeline.projects[action.payload.idx].selected = true
        DISPLAY_PROJECT_DETAIL.currentProject.selected = true
      }
    return DISPLAY_PROJECT_DETAIL;

    case 'CLOSE_PROJECT_DETAIL':
      let CLOSE_PROJECT_DETAIL = {...state}
       CLOSE_PROJECT_DETAIL.showDetail = false
       CLOSE_PROJECT_DETAIL.timeline.projects.map(p=>{
         if (p.selected) p.selected = false
         return p
       })
      setTimeout(()=>CLOSE_PROJECT_DETAIL.currentProject = null,400)
    return CLOSE_PROJECT_DETAIL;

    case 'QBO_OVERLAP':
      let QBO_OVERLAP = {...state}
      QBO_OVERLAP.overlap.qbo = action.payload
    return QBO_OVERLAP;

    case 'SET_HEIGHT':
      let SET_HEIGHT = {...state}
      SET_HEIGHT.height = action.payload
      return SET_HEIGHT;

    case 'OPEN_ABOUT':
      let OPEN_ABOUT = {...state}
      OPEN_ABOUT.showDetail = true
      OPEN_ABOUT.currentProject = null
    return OPEN_ABOUT;

    case 'OPEN_SIDE':
      let OPEN_SIDE = {...state}
      OPEN_SIDE.showDetail = true
    return OPEN_SIDE;

    case 'TOGGLE_SIDE':
      let TOGGLE_SIDE = {...state}
      if (TOGGLE_SIDE.showDetail) setTimeout(()=>TOGGLE_SIDE.currentProject = null,400)
      TOGGLE_SIDE.showDetail = !TOGGLE_SIDE.showDetail
    return TOGGLE_SIDE;

    case 'OFFSET_DOWN':
      let OFFSET_DOWN = {...state}
      OFFSET_DOWN.range.interactionCount++
      const offsetPos = action.payload/window.innerWidth*100
      OFFSET_DOWN.range.offsetStart = offsetPos
      OFFSET_DOWN.range.offsetDown = true
      OFFSET_DOWN.noSelect = true
    return OFFSET_DOWN;

    case 'START_DOWN':
      let START_DOWN = {...state}
      START_DOWN.range.interactionCount++
      START_DOWN.range.startDown = true
      START_DOWN.noSelect = true
    return START_DOWN;

    case 'END_DOWN':
      let END_DOWN = {...state}
      END_DOWN.range.interactionCount++
      END_DOWN.range.endDown = true
      END_DOWN.noSelect = true
    return END_DOWN;

    case 'WINDOW_UP':
      let WINDOW_UP = {...state}
      if (WINDOW_UP.range.offsetDown ||
          WINDOW_UP.range.startDown ||
          WINDOW_UP.range.endDown) {
        WINDOW_UP.range.offsetDown = false
        WINDOW_UP.range.startDown = false
        WINDOW_UP.range.endDown = false
        WINDOW_UP.noSelect = false
        const startPos = WINDOW_UP.range.start + WINDOW_UP.range.offset
        const endPos = WINDOW_UP.range.end + WINDOW_UP.range.offset
        if (startPos >= 0 && endPos <= 100) {
          WINDOW_UP.range.start = startPos
          WINDOW_UP.range.end = endPos
          WINDOW_UP.range.oldPos = WINDOW_UP.range.oldPos + WINDOW_UP.range.projectTranslate
          WINDOW_UP.range.projectLeft = WINDOW_UP.range.projectTranslate
          const delta = WINDOW_UP.range.end - WINDOW_UP.range.start
        } else if (startPos <= 0) {
          WINDOW_UP.range.end = WINDOW_UP.range.end - WINDOW_UP.range.start
          WINDOW_UP.range.start = 0
          WINDOW_UP.range.oldPos = 0
          WINDOW_UP.range.projectLeft = 0
        } else if (endPos >= 100) {
          WINDOW_UP.range.oldPos = 0
          WINDOW_UP.range.end = 50
          WINDOW_UP.range.start = 0
          WINDOW_UP.range.zoom = 200
        }
        const delta = WINDOW_UP.range.end - WINDOW_UP.range.start
        WINDOW_UP.range.zoom = 100/(delta/100)
        WINDOW_UP.range.offset = 0
        WINDOW_UP.range.projectTranslate = 0
      }
    return WINDOW_UP;


    case 'RANGE_MOVE':
      let RANGE_MOVE = {...state}
      const rangePos = action.payload
      if (RANGE_MOVE.range.startDown) {
        RANGE_MOVE.range.start = (rangePos-60)/window.innerWidth*100
        RANGE_MOVE.range.projectTranslate = -((rangePos/window.innerWidth*100) - RANGE_MOVE.range.offsetStart)
        if (RANGE_MOVE.range.start - RANGE_MOVE.range.end >= 0) {
          RANGE_MOVE.range.end = (rangePos/window.innerWidth*100) + 10
        }
      } else if (RANGE_MOVE.range.endDown) {
        RANGE_MOVE.range.end = rangePos/window.innerWidth*100
        if (RANGE_MOVE.range.end - RANGE_MOVE.range.start <= 0) {
          RANGE_MOVE.range.start = (rangePos/window.innerWidth*100) - 10
        }
      } else if (RANGE_MOVE.range.offsetDown) {
        RANGE_MOVE.range.offset = ((rangePos/window.innerWidth*100) - RANGE_MOVE.range.offsetStart)
        RANGE_MOVE.range.projectTranslate = -((rangePos/window.innerWidth*100) - RANGE_MOVE.range.offsetStart)
      }

      const delta = RANGE_MOVE.range.end - RANGE_MOVE.range.start
      RANGE_MOVE.range.zoom = 100/(delta/100)

    return RANGE_MOVE;


    case 'SEARCH_CHANGE':
      let SEARCH_CHANGE = {...state}
      SEARCH_CHANGE.search.searchIsChanging = true
      const val = action.payload
      SEARCH_CHANGE.search.stringToMatch = val
      if (val === '') SEARCH_CHANGE.search.searchIsChanging = false

      const filteredList = SEARCH_CHANGE.timeline.projects.map(f=>{
        if (val !== '' &&
        f.name.toLowerCase().includes(val.toLowerCase())) {
          const s = f.name.toLowerCase().indexOf(val.toLowerCase())
          const e = val.length
          let match = ''
          let join = '<em>'+val+'</em>'
          f.name.toLowerCase().split(val.toLowerCase()).join(join).split('^^').forEach((s,i,r)=>match+=s)

          return {
            name:f.name,
            pm:f.sbsegPM,
            match: match,
          }
        }
      }).filter(f=>f!== undefined)
      SEARCH_CHANGE.search.matchedProjects = [...filteredList]
    return SEARCH_CHANGE;


    case 'SEARCH_FOCUS':
      let SEARCH_FOCUS = {...state}
      SEARCH_FOCUS.search.searchFocus = true
    return SEARCH_FOCUS;


    case 'SEARCH_BLUR':
      let SEARCH_BLUR = {...state}
      SEARCH_BLUR.search.searchFocus = false
      if (!SEARCH_BLUR.search.matchedProjects.length) SEARCH_BLUR.search.searchIsChanging = false
    return SEARCH_BLUR;


    case 'REMOVE_FILTER':
      let REMOVE_FILTER = {...state}
      REMOVE_FILTER.search.filteredProjects.pop(action.payload)
    return REMOVE_FILTER;



    case 'SET_FILTERED_PROJECTS':
      let SET_FILTERED_PROJECTS = {...state}
      SET_FILTERED_PROJECTS.search.searchIsChanging = false
      SET_FILTERED_PROJECTS.search.stringToMatch = ''
      SET_FILTERED_PROJECTS.search.filteredProjects.push(action.payload)
    return SET_FILTERED_PROJECTS;

    case 'RATE_UX':
      let RATE_UX = {...state}
      if (RATE_UX.rate.selected !== action.payload) {
        RATE_UX.rate.selected = action.payload
      } else {
        RATE_UX.rate.selected = null
      }
    return RATE_UX;


    case 'RESET_TIMELINE':
      let RESET_TIMELINE = {...state}
      RESET_TIMELINE.range.oldPos = 0
      RESET_TIMELINE.range.end = 50
      RESET_TIMELINE.range.start = 0
      RESET_TIMELINE.range.interactionCount = 0
      RESET_TIMELINE.range.zoom = 200
    return RESET_TIMELINE;


    case 'CREATE_NEW_USER':
      let CREATE_NEW_USER = {...state}

      const newUKUserKey = firebase.database().ref().child('uk_user').push().key
      const firstUserSessionKey = firebase.database().ref().child('uk_user').push().key
      const firstUserSession = {sessionStart: moment().format("dddd, MMMM Do YYYY, h:mm:ss a")}
      const createNewUser = {}
      createNewUser['/uk_users/' + newUKUserKey +'/sessions/' + firstUserSessionKey] = firstUserSession
      firebase.database().ref().update(createNewUser)

      document.cookie = 'userID=' + newUKUserKey
      CREATE_NEW_USER.cookies.userID = newUKUserKey
      CREATE_NEW_USER.cookies.currentSessionKey = firstUserSessionKey
      CREATE_NEW_USER.cookies.sessionStart = sessionStart
    return CREATE_NEW_USER;


    case 'SET_USER_LOCATION':
      let SET_USER_LOCATION = {...state}
      const userLocation = action.payload.country_name
      firebase.database().ref().child('/uk_users/' + SET_USER_LOCATION.cookies.userID+'/userLocation')
      .set(userLocation)
      if (action.payload.ip === '88.145.43.3') {
        firebase.database().ref().child('/uk_users/' + SET_USER_LOCATION.cookies.userID+'/isMe')
        .set(true)
      }
      SET_USER_LOCATION.cookies.location = action.payload.country_name
    return SET_USER_LOCATION;



    case 'GET_ID_FROM_COOKIE':
      let GET_ID_FROM_COOKIE = {...state}
    return startANewSession(GET_ID_FROM_COOKIE);

    case 'END_SESSION':
      let END_SESSION = {...state}
    return endSession(END_SESSION);


    case 'UPDATE_STATS':
      let UPDATE_STATS = {...state}
      UPDATE_STATS.pristine = false
      UPDATE_STATS.pristine = false
      if (!UPDATE_STATS.cookies.interactions.hasOwnProperty(action.payload)) UPDATE_STATS.cookies.interactions[action.payload] = 0
      let plusOne = UPDATE_STATS.cookies.interactions[action.payload]
      plusOne++
      UPDATE_STATS.cookies.interactions[action.payload] = plusOne
      UPDATE_STATS.cookies.orderOfInteractions.push(action.payload)

      const clickNow = moment()
      setTimeout(()=>{
        UPDATE_STATS.idle = true
      },UPDATE_STATS.idleTimeout)
      UPDATE_STATS.lastInteraction = clickNow
    return UPDATE_STATS;


    case 'ACCEPT_COOKIES':
      let ACCEPT_COOKIES = {...state}
      ACCEPT_COOKIES.cookiesAccepted = true
      ACCEPT_COOKIES.askForCookies = false
    return ACCEPT_COOKIES;

    case 'ASK_FOR_COOKIES':
      let ASK_FOR_COOKIES = {...state}
      ASK_FOR_COOKIES.askForCookies = true
    return ASK_FOR_COOKIES;


    case 'CHECK_IDLE':
      let CHECK_IDLE = {...state}
    return checkIdle(CHECK_IDLE);

    case 'ACTIVE_AGAIN':
      let ACTIVE_AGAIN = {...state}
      ACTIVE_AGAIN.idle = false
      ACTIVE_AGAIN.pristine = true
      setTimeout(()=>checkIdle(ACTIVE_AGAIN),ACTIVE_AGAIN.idleTimeout)
    return startANewSession(ACTIVE_AGAIN);

    case 'NEXT_TIP':
    let NEXT_TIP = {...state}
    let currentNext = NEXT_TIP.onBoarding.current
    currentNext++
    NEXT_TIP.onBoarding.current = currentNext
    if (currentNext >= NEXT_TIP.onBoarding.steps.length + 1) {
      NEXT_TIP.onBoarding.show = false
      NEXT_TIP.onBoarding.current = -1
    }

    if (NEXT_TIP.onBoarding.steps[NEXT_TIP.onBoarding.current] === 'about' ||
      NEXT_TIP.onBoarding.steps[NEXT_TIP.onBoarding.current] === 'roadmap') {
        if (NEXT_TIP.onBoarding.steps[NEXT_TIP.onBoarding.current] === 'roadmap') {
          NEXT_TIP.currentProject = NEXT_TIP.timeline.perTeam['Madeline Guyette'].projects[0]
        } else {
          NEXT_TIP.currentProject = null
        }
      NEXT_TIP.showDetail = true
    } else {
      NEXT_TIP.showDetail = false
    }
    return NEXT_TIP;

    case 'CLOSE_TIPS':
    let CLOSE_TIPS = {...state}
      CLOSE_TIPS.onBoarding.show = false
      CLOSE_TIPS.onBoarding.current = -1
      if(CLOSE_TIPS.showDetail) {
        CLOSE_TIPS.showDetail = false
        CLOSE_TIPS.currentProject = {}
      }
      closeSide(CLOSE_TIPS)
      document.cookie = 'onboarded=1'
    return CLOSE_TIPS;

    case 'RESTART_TIPS':
    let RESTART_TIPS = {...state}
      RESTART_TIPS.onBoarding.current = -1
    return RESTART_TIPS;

    case 'SHOW_TIPS':
    let SHOW_TIPS = {...state}
      SHOW_TIPS.onBoarding.showIt = true
    return SHOW_TIPS;

    case 'IS_ONBOARDED':
    let IS_ONBOARDED = {...state}
      IS_ONBOARDED.onBoarding.show = true
    return IS_ONBOARDED;

    case 'PREVIOUS_TIP':
    let PREVIOUS_TIP = {...state}
    let currentPrev = PREVIOUS_TIP.onBoarding.current
    currentPrev--
    PREVIOUS_TIP.onBoarding.current = currentPrev
    if (PREVIOUS_TIP.onBoarding.steps[PREVIOUS_TIP.onBoarding.current] === 'about' ||
      PREVIOUS_TIP.onBoarding.steps[PREVIOUS_TIP.onBoarding.current] === 'roadmap') {
        if (PREVIOUS_TIP.onBoarding.steps[PREVIOUS_TIP.onBoarding.current] === 'roadmap') {
          PREVIOUS_TIP.currentProject = PREVIOUS_TIP.timeline.perTeam['Madeline Guyette'].projects[0]
        }
      PREVIOUS_TIP.showDetail = true
    } else {
      PREVIOUS_TIP.showDetail = false
    }
    return PREVIOUS_TIP;

    default: throw new Error('Unexpected action');
  }
}

export default pivotReducer
export { initialPivotState }
