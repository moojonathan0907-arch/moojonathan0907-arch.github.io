// Importar funciones de Firebase (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- PEGA AQUÍ TU CONFIGURACIÓN DE FIREBASE (DEL PASO 1) ---
const firebaseConfig = {
  apiKey: "AIzaSyC3gN26aHfQ8fz0iv4ZncXXuRUWZOE9r_o",
  authDomain: "raices-sociales.firebaseapp.com",
  projectId: "raices-sociales",
  storageBucket: "raices-sociales.firebasestorage.app",
  messagingSenderId: "616005031226",
  appId: "1:616005031226:web:863a83f93add0d53a0ac03",
  measurementId: "G-G6WS0ES9QS"
};
// -----------------------------------------------------------

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Variables globales de usuario
let currentUser = null;

// 1. FUNCIÓN PARA INICIAR SESIÓN
window.loginGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        console.log("Usuario logueado:", user.displayName);
        alert(`Bienvenido, ${user.displayName}`);
        // Al loguearse, verificamos si ya tiene datos guardados
        cargarDatosDeNube(user.uid);
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        alert("Hubo un error al iniciar sesión.");
    }
};

// 2. FUNCIÓN PARA CERRAR SESIÓN
window.logoutGoogle = () => {
    signOut(auth).then(() => {
        alert("Sesión cerrada.");
        location.reload();
    }).catch((error) => {
        console.error(error);
    });
};

// 3. DETECTAR CAMBIO DE ESTADO (Si el usuario ya entró antes)
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        actualizarBotonLogin(true, user);
        cargarDatosDeNube(user.uid); // Sincronizar datos
    } else {
        currentUser = null;
        actualizarBotonLogin(false);
    }
});

// 4. GUARDAR PROGRESO (Reemplaza al localStorage)
window.guardarProgreso = async (tipo, item) => {
    // Si no está logueado, usamos localStorage como respaldo
    if (!currentUser) {
        let localData = JSON.parse(localStorage.getItem(tipo)) || [];
        if (!localData.includes(item)) {
            localData.push(item);
            localStorage.setItem(tipo, JSON.stringify(localData));
            console.log("Guardado localmente (sin usuario).");
        }
        return;
    }

    // Si SÍ está logueado, guardamos en la nube
    const userRef = doc(db, "usuarios", currentUser.uid);
    
    try {
        // Verificar si el documento existe, si no, crearlo
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
            await setDoc(userRef, { readBooks: [], completedQuizzes: [] });
        }

        // Actualizar el array correspondiente
        if (tipo === 'readBooks') {
            await updateDoc(userRef, { readBooks: arrayUnion(item) });
        } else if (tipo === 'completedQuizzes') {
            await updateDoc(userRef, { completedQuizzes: arrayUnion(item) });
        }
        console.log("Progreso guardado en la nube.");
    } catch (e) {
        console.error("Error guardando en nube: ", e);
    }
};

// 5. CARGAR DATOS DESDE LA NUBE Y ACTUALIZAR LOCALSTORAGE
async function cargarDatosDeNube(uid) {
    const userRef = doc(db, "usuarios", uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        // Sincronizamos la nube con el localStorage para que tus otros scripts funcionen igual
        localStorage.setItem('readBooks', JSON.stringify(data.readBooks || []));
        localStorage.setItem('completedQuizzes', JSON.stringify(data.completedQuizzes || []));
        
        // Si estamos en la página de progreso, recargar para mostrar cambios
        if(window.location.pathname.includes('progreso.html')) {
            location.reload(); 
        }
    }
}

// Auxiliar: Actualizar Interfaz (Menú y Bienvenida)
function actualizarBotonLogin(estaLogueado, user = null) {
    // 1. Elementos del Sidebar
    const loginLi = document.getElementById('loginBtnLi');
    const profileLi = document.getElementById('userProfile');
    const imgPerfil = document.getElementById('userPhoto');
    const nombrePerfil = document.getElementById('userName');
    
    // 2. Elemento del Título en Index (Hola, estudiante)
    const tituloBienvenida = document.getElementById('welcomeName');

    if (estaLogueado && user) {
        // --- ESTADO: LOGUEADO ---
        
        // A. Sidebar: Mostrar perfil
        if (loginLi) loginLi.style.display = 'none';
        if (profileLi) {
            profileLi.style.display = 'block';
            nombrePerfil.innerText = user.displayName;
            // Foto de perfil
            if (user.photoURL) {
                imgPerfil.src = user.photoURL;
            } else {
                imgPerfil.src = "https://ui-avatars.com/api/?background=random&name=" + user.displayName;
            }
        }

        // B. Título Index: Cambiar "estudiante" por el nombre
        if (tituloBienvenida) {
            // Usamos split(' ')[0] para tomar solo el primer nombre y que se vea mejor
            const primerNombre = user.displayName.split(' ')[0];
            tituloBienvenida.innerText = primerNombre;
        }

    } else {
        // --- ESTADO: NO LOGUEADO ---
        
        // A. Sidebar: Mostrar botón login
        if (loginLi) loginLi.style.display = 'block';
        if (profileLi) profileLi.style.display = 'none';

        // B. Título Index: Regresar a "estudiante"
        if (tituloBienvenida) {
            tituloBienvenida.innerText = "estudiante";
        }
    }
}

// --- LÓGICA PARA MENÚ MÓVIL ---
document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    if(menuBtn) {
        menuBtn.addEventListener('click', () => {
            // Alternar la clase 'active' en el sidebar
            sidebar.classList.toggle('active');
            
            // Cambiar el ícono (opcional: de hamburguesa a X)
            const icon = menuBtn.querySelector('i');
            if (sidebar.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
            } else {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        });

        // Cerrar menú al hacer clic fuera (en el contenido)
        mainContent.addEventListener('click', () => {
            if (sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                const icon = menuBtn.querySelector('i');
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        });
    }
});