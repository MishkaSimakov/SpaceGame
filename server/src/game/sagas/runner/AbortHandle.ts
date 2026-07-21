export class AbortHandle {
    private aborter?: (error: any) => void;
    private hasPriorError: boolean = false;
    private priorError: any;

    setAborter(aborter: (error: any) => void): void {
        this.aborter = aborter;

        if (this.hasPriorError) {
            this.aborter(this.priorError);
        }
    }

    abort(error: any): void {
        if (this.aborter !== undefined) {
            this.aborter(error);
        } else if (!this.hasPriorError) {
            // store only the first error
            this.hasPriorError = true;
            this.priorError = error;
        }
    }
}