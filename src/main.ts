import { supabase } from './supabaseClient';
import { AuthView } from './components/AuthView';
import { HomeView } from './components/HomeView';
import { ProfileView } from './components/ProfileView';
import { authService } from './services/authService';
import type { View } from './types'; // Assuming View interface is in types.ts
 
// --- DOM Elements ---
const mainContentContainer = document.getElementById('main-content');
const views: Record<string, View> = {}; // Map for route -> View instance
 
if (!mainContentContainer) {
    console.error("FATAL: Main content container element with id 'main-content' not found in index.html.");
}
 
// --- View Management ---
 
function getRouteFromHash(): string {
    const hash = window.location.hash.substring(1); // Remove '#'
    switch (hash.toLowerCase()) {
        case 'home':
            return 'home';
        case 'profile':
            return 'profile';
        case 'auth':
        case '': // Default route for empty hash or logged out state
            return 'auth';
        default:
            return 'home'; // Fallback for unknown routes - default to home or a 404 page
    }
}
 
async function loadAndRenderCurrentView(userSession: any) {
    if (!mainContentContainer) return;
 
    const route = getRouteFromHash();
    let viewInstance: View | undefined;
    let defaultRoute = 'auth'; // Default for unauthenticated
    
    if (userSession && userSession.id) {
        // Authenticated routes: Home or Profile
        defaultRoute = 'home';
        
        if (route === 'profile') {
            viewInstance = views.profile;
        } else {
            // Default or #home
            viewInstance = views.home;
        }
    } else {
        // Unauthenticated route: Auth
        viewInstance = views.auth;
    }
 
    // Use the determined instance, falling back to default route view if necessary
    const finalViewInstance = viewInstance ?? views[defaultRoute];
 
    if (finalViewInstance) {
        mainContentContainer.innerHTML = ''; // Clear container before loading new view
        try {
            await finalViewInstance.loadAndRender(mainContentContainer);
        } catch (e) {
            console.error(`Error loading/rendering view for route ${route}:`, e);
            mainContentContainer.innerHTML = `<p class="error">Failed to load view content.</p>`;
        }
    } else {
        mainContentContainer.innerHTML = `<p class="error">FATAL: Could not determine view to render for route: ${route}</p>`;
    }
}
 
/**
 * Initializes the application: checks state, renders initial view, and sets up auth listener.
 */
export async function initializeApp() {
    if (!mainContentContainer) return;

    // Initialize View Instances
    views.auth = new AuthView();
    views.home = new HomeView();
    views.profile = new ProfileView();

    // 1. Check initial authentication state
    const isAuthenticated = await authService.checkAuthStatus();
    
    // 2. Render initial view based on state, overriding the hash for initial strict switching.
    let initialUser: any = null;
    if (isAuthenticated) {
        // If authenticated, force to HomeView by setting hash and passing a minimal user object.
        window.location.hash = '#home';
        initialUser = { id: 'initial_authenticated_user_placeholder' };
    } else {
        // If not authenticated, ensure we are on the auth route by clearing the hash and passing null.
        window.location.hash = '#auth';
        initialUser = null;
    }
    await loadAndRenderCurrentView(initialUser);

    // 3. Set up Supabase Auth subscription handler
    supabase.auth.onAuthStateChange((event, session) => {
        console.log(`Auth state changed: ${event}`);
        const user = session?.user ?? null;
        
        // 4. Re-render the appropriate view instantly upon auth change
        loadAndRenderCurrentView(user);
    });
    
    // 5. Set up Router for hash changes
    window.addEventListener('hashchange', async () => {
        console.log(`Hash changed to: ${window.location.hash}`);
        // Re-run view rendering based on new hash and current session state
        const currentUser = await authService.getSessionUser();
        await loadAndRenderCurrentView(currentUser);
    });
    
    console.log("iPing Application Initialized: Router and Auth listener set up.");
}
 
// --- Application Start ---
initializeApp();
