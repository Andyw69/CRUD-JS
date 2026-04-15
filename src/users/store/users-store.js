import { loadUsersByPage } from "../use-cases/load-users-by-page";



const state = {
    currentPage: 0,
    users: [],
}


const loadNextPage = async() => {
    const {pages, users } = await loadUsersByPage( state.currentPage + 1 );
    // if(next === null) return;
    if(users.length === 0 ) return;
    
    if(state.currentPage === pages) return;
    
    state.currentPage += 1;
    state.users = users;

    
}

const loadPreviousPage = async() => {
    if(state.currentPage === 1) return;
    const { users } = await loadUsersByPage( state.currentPage - 1);

    state.users = users;
    state.currentPage -= 1;
}

const onUserChanged = async() => {
    throw new Error('No implementado');
}

const reloadPage = async() => {
    throw new Error('No implementado');
}

export default{
    loadNextPage,
    loadPreviousPage,
    onUserChanged,
    reloadPage,

    /**
     * 
     * @returns {User[]}
     */
    getUsers: () => [ ...state.users ],

    /**
     * @returns {Number}
     */
    getCurrentPage: () => state.currentPage,

    
    
    // getPages: () => Math.ceil(state.users.length / 10),
}
