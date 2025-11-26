import { authService } from "../services/authService";

/**
 * Enum for the state of the input process.
 */
enum InputState {
    Idle = 'idle',
    AwaitingCommand = 'awaiting_command', // Added for initial command prompt
    AwaitingEmail = 'awaiting_email',
    AwaitingPassword = 'awaiting_password',
    Processing = 'processing',
}

/**
 * Interface for the command context.
 */
interface AuthContext {
    command: 'login' | 'register' | null;
    email: string | null;
    password: string | null;
}

export class AuthView {
    private container?: HTMLElement;
    private outputLog: string[] = [];
    private currentInput: string = '';
    private inputState: InputState = InputState.AwaitingCommand;
    private authContext: AuthContext = { command: null, email: null, password: null };
    private inputElement?: HTMLInputElement;
    private outputElement?: HTMLElement;

    private readonly PROMPT = 'user@terminal:~$ ';
    private readonly ERROR_PREFIX = 'Error: ';
    private readonly SUCCESS_PREFIX = 'Success: ';

    public async loadAndRender(container: HTMLElement): Promise<void> {
        this.container = container;
        this.initializeDOM();
        this.logToOutput(`Welcome to iPing Terminal Auth Interface. Type 'login' or 'register' to begin.`);
        this.updatePrompt();
        this.attachEventListeners();
    }

    private initializeDOM(): void {
        this.container!.innerHTML = `
            <div id="terminal-container" style="background-color: #1e1e1e; color: #cccccc; font-family: monospace; padding: 10px; border: 1px solid #555; height: 100%; display: flex; flex-direction: column; box-sizing: border-box;">
                <div id="terminal-output" style="flex-grow: 1; overflow-y: auto; white-space: pre-wrap;"></div>
                <div id="terminal-input-line" style="display: flex; align-items: center;">
                    <span id="terminal-prompt"></span>
                    <input type="text" id="terminal-input" style="flex-grow: 1; background: transparent; border: none; color: #cccccc; outline: none; caret-color: #cccccc;" autofocus>
                </div>
            </div>
        `;
        this.outputElement = this.container!.querySelector('#terminal-output')!;
        this.inputElement = this.container!.querySelector('#terminal-input')!;
        this.container!.querySelector('#terminal-prompt')!.textContent = this.PROMPT;

        // Set initial focus to input element when component loads/renders
        setTimeout(() => {
            this.inputElement!.focus();
        }, 0);
    }

    private attachEventListeners(): void {
        this.inputElement!.addEventListener('keydown', this.handleKeyDown.bind(this));
        // Also listen for clicks on the container to refocus input if it loses focus
        this.container!.addEventListener('click', () => this.inputElement!.focus());
    }

    private logToOutput(message: string): void {
        this.outputLog.push(message);
        this.renderOutput();
    }

    private renderOutput(): void {
        this.outputElement!.innerHTML = this.outputLog.join('\n');
        // Auto-scroll to the bottom
        this.outputElement!.scrollTop = this.outputElement!.scrollHeight;
    }

    private updatePrompt(): void {
        this.inputElement!.value = ''; // Clear current input on new prompt state
        
        switch (this.inputState) {
            case InputState.AwaitingCommand:
                this.container!.querySelector('#terminal-prompt')!.textContent = this.PROMPT;
                this.inputElement!.type = 'text';
                this.inputElement!.disabled = false;
                break;
            case InputState.AwaitingEmail:
                this.container!.querySelector('#terminal-prompt')!.textContent = 'Email: ';
                this.inputElement!.type = 'email';
                this.inputElement!.disabled = false;
                break;
            case InputState.AwaitingPassword:
                this.container!.querySelector('#terminal-prompt')!.textContent = 'Password: ';
                this.inputElement!.type = 'password';
                this.inputElement!.disabled = false;
                break;
            case InputState.Processing:
                this.container!.querySelector('#terminal-prompt')!.textContent = 'Processing... ';
                this.inputElement!.disabled = true; // Disable input while processing
                break;
        }
    }

    private async handleKeyDown(event: KeyboardEvent): Promise<void> {
        if (event.key === 'Enter') {
            event.preventDefault();
            const commandOrValue = this.inputElement!.value.trim();
            this.currentInput = commandOrValue;
            this.inputElement!.value = ''; // Clear input field immediately

            if (this.inputState === InputState.Processing) {
                return; // Ignore input while processing
            }

            await this.processInput(commandOrValue);
            this.updatePrompt();
        }
    }

    private async processInput(input: string): Promise<void> {
        switch (this.inputState) {
            case InputState.AwaitingCommand:
                await this.handleCommandInput(input);
                break;
            case InputState.AwaitingEmail:
                await this.handleEmailInput(input);
                break;
            case InputState.AwaitingPassword:
                await this.handlePasswordInput(input);
                break;
            default:
                // Should not happen if prompt is disabled in Processing state
                break;
        }
    }

    private async handleCommandInput(command: string): Promise<void> {
        const lowerCommand = command.toLowerCase();
        this.logToOutput(`${this.PROMPT}${command}`); // Echo command to log

        if (lowerCommand === 'login' || lowerCommand === 'register') {
            this.authContext.command = lowerCommand as 'login' | 'register';
            this.inputState = InputState.AwaitingEmail;
            this.logToOutput(`Authentication mode: ${lowerCommand.toUpperCase()}.`);
        } else {
            this.logToOutput(`${this.ERROR_PREFIX}Unknown command: "${command}". Try 'login' or 'register'.`);
            this.inputState = InputState.AwaitingCommand; // Stay in idle/awaiting_command
        }
    }

    private async handleEmailInput(email: string): Promise<void> {
        this.logToOutput(`Email: ${email}`); // Echo email (not masked in this step)
        
        if (!email.includes('@') || email.length < 3) {
            this.logToOutput(`${this.ERROR_PREFIX}Invalid email format. Please re-enter email.`);
            this.inputState = InputState.AwaitingEmail; // Stay in awaiting_email
            return;
        }

        this.authContext.email = email;
        this.inputState = InputState.AwaitingPassword;
    }

    private async handlePasswordInput(password: string): Promise<void> {
        // Do not echo password to outputLog, just show 'Password: ********' in the prompt area
        this.authContext.password = password;
        
        if (!this.authContext.email || !this.authContext.command) {
             this.logToOutput(`${this.ERROR_PREFIX}Internal state error. Restarting command entry.`);
             this.authContext = { command: null, email: null, password: null };
             this.inputState = InputState.AwaitingCommand;
             return;
        }

        this.inputState = InputState.Processing;
        this.logToOutput(`Password: ${'*'.repeat(password.length)}`); // Show masked password in log
        this.updatePrompt(); // Update prompt to show disabled state

        const { session, error } = await this.executeAuthCall(this.authContext.email, password);
        
        if (error) {
            this.logToOutput(`${this.ERROR_PREFIX}Authentication failed: ${error.message || JSON.stringify(error)}`);
        } else {
            this.logToOutput(`${this.SUCCESS_PREFIX}Authentication successful! Session obtained for: ${this.authContext.email}.`);
            // In a real app, you might dispatch an event to main.ts to navigate away.
            // For now, logging success is sufficient as per instruction 5.
        }

        // Reset state after processing
        this.authContext = { command: null, email: null, password: null };
        this.inputState = InputState.AwaitingCommand;
        this.logToOutput(`Operation complete. Ready for next command.`);
        this.updatePrompt();
    }

    private async executeAuthCall(email: string, password: string): Promise<{ session: any | null, error: any | null }> {
        if (this.authContext.command === 'login') {
            return authService.signIn(email, password);
        } else if (this.authContext.command === 'register') {
            return authService.signUp(email, password);
        }
        // Should be unreachable
        return { session: null, error: { message: 'Internal Auth Command Error' } };
    }
}