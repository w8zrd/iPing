import { authService } from '../services/authService';
import { supabase } from '../supabaseClient'; // Assuming this path based on project context
import type { Profile } from '../types'; // Assuming Profile or similar type exists, otherwise use a general type for user data

// Define a simple structure for user profile based on Supabase session.user
interface UserProfile {
    id: string;
    email: string | null;
    lastLogin?: string;
}

export class HomeView {
    private containerElement: HTMLElement | undefined;
    
    // State management
    private outputLog: string[] = [];
    private input: string = '>';
    private userProfile: UserProfile | null = null;
    private isProcessingCommand: boolean = false;

    /**
     * Processes the command entered by the user.
     * @param command The raw input string (e.g., "> whoami").
     */
    private async processCommand(rawCommand: string): Promise<void> {
        const command = rawCommand.trim().toLowerCase();
        
        // 1. Log the command to the output log
        this.appendToLog(rawCommand);
        this.input = '>'; // Reset input to prompt character
        this.isProcessingCommand = true; // Prevent re-submission during processing

        // 2. Command parsing and execution
        if (command === '> whoami') {
            if (this.userProfile) {
                this.appendToLog(`User ID: ${this.userProfile.id}`);
                this.userProfile.email && this.appendToLog(`Email: ${this.userProfile.email}`);
            } else {
                this.appendToLog('Error: User profile data is not loaded.');
            }
        } else if (command === '> logout') {
            this.appendToLog('Signing out...');
            try {
                await authService.signOut();
                // Signal success. main.ts listener will detect session change and switch view.
                this.appendToLog('Logout successful. Redirecting to login view...');
            } catch (error) {
                this.appendToLog(`Error during logout: ${(error as Error).message}`);
            }
        } else if (command === '> clear') {
            this.outputLog = [];
        } 
        else if (command.startsWith('>')) {
            this.appendToLog(`Unknown command: ${command.substring(1).trim()}. Supported: > whoami, > logout, > clear`);
        } else {
            // Handle non-command input if necessary, or just log it as is
             this.appendToLog(`Not a recognized command: ${rawCommand}`);
        }

        this.isProcessingCommand = false;
        if (this.containerElement) {
            this.render(this.containerElement);
        }
    }
    
    private appendToLog(message: string): void {
        this.outputLog.push(message);
        // Keep log from growing indefinitely, e.g., last 50 lines
        if (this.outputLog.length > 50) {
            this.outputLog = this.outputLog.slice(this.outputLog.length - 50);
        }
    }

    private setupInputListener(inputElement: HTMLInputElement): void {
        // Handle command submission on Enter key press
        inputElement.onkeydown = (event) => {
            if (event.key === 'Enter' && !this.isProcessingCommand) {
                event.preventDefault(); // Prevent form submission if it was in a form
                const commandValue = inputElement.value;
                inputElement.value = '>'; // Visually reset the input field immediately
                this.input = '>'; // Update internal state for next render/input focus
                this.processCommand(commandValue);
            }
        };
        
        // Update internal state on input change
        inputElement.oninput = (event) => {
            if (!this.isProcessingCommand) {
                 this.input = (event.target as HTMLInputElement).value;
            } else {
                 // Lock input if command is being processed, restore to prompt character
                 inputElement.value = '>';
                 this.input = '>';
            }
        };

        // Ensure input always starts with '>'
        if (inputElement.value === '') {
            inputElement.value = '>';
            this.input = '>';
        }
    }

    public async loadAndRender(container: HTMLElement): Promise<void> {
        this.containerElement = container;
        this.appendToLog('Initializing HomeView (Terminal Interface)...');

        // 1. Check authentication status
        const isAuthenticated = await authService.checkAuthStatus();
        
        if (!isAuthenticated) {
            this.appendToLog('Error: Not authenticated. View should have been prevented by router.');
            this.render(container);
            return;
        }

        // 2. Retrieve user profile information (as per instructions)
        try {
            // Fetch user details via supabase client access
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (error || !user) {
                throw new Error(error?.message || 'User data not available after successful auth check.');
            }

            this.userProfile = {
                id: user.id,
                email: user.email || null,
                lastLogin: new Date().toLocaleString(),
            };
            
            // Log welcome message
            const welcomeIdentifier = this.userProfile.email || this.userProfile.id.substring(0, 8);
            this.appendToLog(`Welcome back, ${welcomeIdentifier}!`);
            this.appendToLog(`Type '> whoami' to see details or '> logout' to sign out.`);

        } catch (e) {
            const errorMsg = (e as Error).message;
            this.userProfile = { id: 'unknown_id', email: null, lastLogin: new Date().toLocaleString() };
            this.appendToLog(`Warning: Could not fully retrieve user profile. Error: ${errorMsg.substring(0, 50)}...`);
            this.appendToLog(`Using placeholder ID for context.`);
        }

        this.render(container);
    }
    
    private render(container: HTMLElement): void {
        if (!this.containerElement) return;
        
        // Use classes for styling resemblance, assuming style.css might have .terminal-container, .terminal-output, etc.
        // Since we don't know the exact structure of style.css, we use basic HTML elements that mimic a terminal.
        
        const outputHtml = this.outputLog.map(line => 
            // Simple styling for command vs output
            line.startsWith('>') ? `<span style="color: #00ff00;">${line}</span>` : line
        ).join('\n');

        const content = `
            <div id="terminal-container" style="background-color: #1e1e1e; color: #ffffff; font-family: monospace; padding: 10px; border: 1px solid #333; height: 80vh; display: flex; flex-direction: column;">
                <div id="terminal-output" style="flex-grow: 1; overflow-y: auto; white-space: pre-wrap; margin-bottom: 10px;">
                    ${outputHtml}
                </div>
                <div id="terminal-input-line" style="display: flex; align-items: center;">
                    <label for="command-input" style="margin-right: 5px; color: #00ff00;">></label>
                    <input 
                        type="text" 
                        id="command-input" 
                        value="${this.input}" 
                        style="background-color: transparent; border: none; color: #ffffff; flex-grow: 1; outline: none;"
                        autofocus
                    />
                </div>
            </div>
        `;
        
        container.innerHTML = `
            <h2>Authenticated Terminal View</h2>
            ${content}
        `;

        // Set up interactivity after content is rendered
        const inputElement = document.getElementById('command-input') as HTMLInputElement;
        if (inputElement) {
            this.setupInputListener(inputElement);
            
            // Scroll to bottom on render
            const outputDiv = document.getElementById('terminal-output');
            if (outputDiv) {
                outputDiv.scrollTop = outputDiv.scrollHeight;
            }
            
            // Ensure input is focused and at the end of the text
            inputElement.focus();
            // Move cursor to end if it's not just the prompt character
            if (this.input.length > 1) {
                 inputElement.setSelectionRange(this.input.length, this.input.length);
            }
        }
    }
}