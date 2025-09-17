import Runner from '../compute/runner';
import * as readline from 'readline';

class CommandLine {
    private rl: readline.Interface;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    public loop() {
        console.log('Welcome to FlowQuery! Type "exit" to quit.');
        this.rl.setPrompt('> ');
        this.rl.prompt();

        this.rl.on('line', (input: string) => {
            if (input === 'exit') {
                this.rl.close();
                return;
            }
            if(input.trim() === '') {
                this.rl.prompt();
                return;
            }
            try {
                const runner = new Runner(input);
                const promise = runner.run();
                promise.then(
                    () => {
                        console.log(runner.results);
                    }
                );
                promise.catch(
                    (e) => console.error(e)
                );
                promise.finally(
                    () => this.rl.prompt()
                );
            } catch (e) {
                console.error(e);
                this.rl.prompt();
            }
        }).on('close', () => {
            console.log('Exiting FlowQuery.');
            process.exit(0);
        });
    }
}

export default CommandLine;