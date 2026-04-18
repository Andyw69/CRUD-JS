import modalHTML from './render-modal.html?raw';
import './render-modal.css';
import { getUserById } from '../../use-cases/get-user-by-id';

let modal, form;
let loadedUser = {};

// TODO: cargar usuario por id
export const showModal = async(id) => {
    modal?.classList.remove('hide-modal');
    loadedUser = {};

    if( !id ) return;

    const user = await getUserById(id);
    setFormValues(user);
}

export const hideModal = () => {
    modal?.classList.add('hide-modal');
    form.reset();
}

/**
 * 
 * @param {User} user
 */
const setFormValues = (user) => {
    form.querySelector('[name="firstName"]').value = user.firstName;
    form.querySelector('[name="lastName"]').value  = user.lastName;
    form.querySelector('[name="balance"]').value   = user.balance;
    form.querySelector('[name="isActive"]').cheked = user.isActive;
    loadedUser = user;
}


/**
 * 
 * @param {HTMLDivElement} element 
 * @param {(userLike)=> Promise<void>} callback
 */
export const renderModal = (element, saveUserCallback) => {

    if( modal ) return;

    modal = document.createElement('div');
    modal.innerHTML = modalHTML;
    modal.className = 'modal-container hide-modal';
    form = modal.querySelector('form');
    

    modal.addEventListener('click', (e) => {
        if(e.target.classList.contains('modal-container')){
            hideModal();
        }
    })
    form.addEventListener('submit', async(e) => {
        e.preventDefault();

        const formData = new FormData(form);
        // El problema es que console.log({formData}) muestra el objeto FormData
        // pero la consola del navegador no expande sus entradas directamente,
        // ya que FormData no es un objeto plano, es iterable pero no enumerable.
        // Para ver los datos debes convertirlo, por ejemplo:
        // console.log(Object.fromEntries(formData));
        // o iterar con: for(const [key, value] of formData) console.log(key, value);
        // console.log(Object.fromEntries(formData));
        // const user = Object.fromEntries(formData);
        
        // console.log({userUpdate: user});
        const userLike = {...loadedUser};
        for(const [key, value] of formData){
            if(key === 'balance'){                
                userLike[key] = +value;
                continue;
            }

            if(key === 'isActive'){
                userLike[key] = (value === 'on') ? true : false;
                continue;
            }
            
            userLike[key] = value;
        }
        
        
        userLike.isActive = formData.get('isActive') === 'on'; 
        // console.log('Este es el Userlike', userLike);

        // TODO: Guardar el usuario
        await saveUserCallback( userLike );
        hideModal();
    });
    element.append( modal );
}