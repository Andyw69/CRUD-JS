import usersStore from '../../store/users-store';
import { deleteUser } from '../../use-cases/delete-user-by-id';
import { showModal } from '../render-modal/render-modal';
import './render-table.css';

let table;

const createTable = () => {
    
    const table = document.createElement('table');
    const tableHeaders = document.createElement('thead');
    tableHeaders.innerHTML = `
        <tr>
            <th>#ID</th>
            <th>Balance</th>
            <th>FirstName</th>
            <th>LastName</th>
            <th>Active</th>
            <th>Actions</th>
        </tr>
    `;
    
    const tablebody = document.createElement('tbody');
    table.append(tableHeaders, tablebody);
    return table;
};




/**
 * 
 * @param {MouseEvent} event 
 * @returns 
 */
const tableSelectListener = (event) => {
    const element = event.target.closest('.select-user');
    if(!element) return;

    const id = element.getAttribute('data-id');
    showModal(id);
};

/**
 * 
 * @param {MouseEvent} event 
 */
const tableDeleteListener = async (event) => {

    const element = event.target.closest('.delete-user');
    if(!element) return;
    const id = element.getAttribute('data-id');
    try {
        await deleteUser( id );
        await usersStore.reloadPage();
        
        const spanPage = document.querySelector('#current-page');
        if(spanPage) spanPage.innerText = usersStore.getCurrentPage();   
        // console.log(spanPage?.innerText);
        renderTable();
        
    } catch (error) {
        console.log(error);
        alert('Error, no se pudo eliminar')
    }

};
/**
 * 
 * @param {HTMLDivElement} element 
 */
export const renderTable = ( element ) => {
    
    const users = usersStore.getUsers();

    if( !table ){
        table = createTable();
        element.append( table );

        //TODO: listeners a la table
        table.addEventListener('click', tableSelectListener );
        table.addEventListener('click', tableDeleteListener );
    }
    let tableHTML = '';
    users.forEach(user => {
        tableHTML += `
            <tr>
                <td>${user.id}</td>
                <td>${user.balance}</td>
                <td>${user.firstName}</td>
                <td>${user.lastName}</td>
                <td>${user.isActive}</td>
                <td>
                    <a href="#/" class="select-user" data-id="${user.id}">Select</a>
                    |
                    <a href="#/" class="delete-user" data-id="${user.id}">Delete</a>
                </td>
            </tr>
        `;
    });

    table.querySelector( 'tbody' ).innerHTML = tableHTML;
}