import usersStore from "../../store/users-store";
import { renderTable } from "../render-table/render-table";
import './render-buttons.css';
/**
 * 
 * @param {HTMLDivElement} element 
 */
export const renderButtons = (element) => {
    
    const nextPage = document.createElement('button');
    nextPage.innerText = ' Next >';

    const previousPage = document.createElement('button');
    previousPage.innerHTML = '< Previous';
    const currentPageLabel = document.createElement('span');
    currentPageLabel.id = 'current-page';
    currentPageLabel.innerHTML = usersStore.getCurrentPage();

    element.append( previousPage, currentPageLabel, nextPage);
    
    nextPage.addEventListener('click', async() => {
        await usersStore.loadNextPage();
        currentPageLabel.innerText = usersStore.getCurrentPage();
        renderTable(element);
    });

    previousPage.addEventListener('click', async() => {

        await usersStore.loadPreviousPage();
        currentPageLabel.innerText = usersStore.getCurrentPage();
        renderTable(element);


    })

};