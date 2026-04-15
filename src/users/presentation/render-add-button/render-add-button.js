
import { showModal } from '../render-modal/render-modal';
import './render-add-button.css';

/**
 * 
 * @param {HTMLDListElement} element 
 */
export const renderAddButton = (element) => {

    const fabButton = document.createElement('Button');

    fabButton.innerText = '+';
    fabButton.classList.add('fab-button');

    element.append(fabButton);

    fabButton.addEventListener('click', () => {
        showModal()
    })
}