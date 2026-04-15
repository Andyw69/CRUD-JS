import { localhostUserToModel } from "../mappers/localhost-user.mapper";
import { User } from "../models/user";

/**
 * 
 * @param {Number} page Numero de pagina
 * @returns {Promise<User[]>}
 */
export const loadUsersByPage = async (page = 1) => {
    const url = `${ import.meta.env.VITE_BASE_URL }/users?_page=${ page }`
    const res = await fetch(url);
    const data = await res.json();
    const {first, pages} = data;
    const users = data.data.map(localhostUserToModel);
    
    //console.log(users);
    
    // console.log( data );
    return {users, first, pages};
}