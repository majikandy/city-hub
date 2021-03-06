import { Component, ViewEncapsulation, ChangeDetectionStrategy, HostBinding, OnInit, ChangeDetectorRef } from '@angular/core';
import { AuthenticationService } from '../../services/authentication.service';
import { Router } from '@angular/router';
import { GlobalService } from '../../services/global.service';
import { ApiService } from '../../services/api.service';
import { ApplicationStateService } from '../../services/application-state.service';
import { WalletInfo } from '../../classes/wallet-info';
import { WalletLoad } from '../../classes/wallet-load';
import { WalletService } from '../../services/wallet.service';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { empty } from 'rxjs';

export interface Account {
    name: string;
    id: string;
}
@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class LoginComponent implements OnInit {
    @HostBinding('class.login') hostClass = true;

    private wallets: [string];
    selectedAccount: Account;
    hasWallet = false;
    accounts: Account[] = [];
    unlocking: boolean;
    password = ''; // Default to empty string, not null/undefined.

    constructor(
        private http: HttpClient,
        private readonly cd: ChangeDetectorRef,
        private authService: AuthenticationService,
        private router: Router,
        private globalService: GlobalService,
        private wallet: WalletService,
        private apiService: ApiService,
        public appState: ApplicationStateService) {

    }

    ngOnInit() {
        this.getWalletFiles();
    }

    changeMode() {
        localStorage.removeItem('Network:Mode');
        this.router.navigateByUrl('/load');
    }

    cancel() {
        this.selectedAccount = null;
    }

    private getWalletFiles() {
        this.apiService.getWalletFiles()
            .subscribe(
                response => {
                    // if (response.status >= 200 && response.status < 400) {
                    this.wallets = response.walletsFiles;
                    this.globalService.setWalletPath(response.walletsPath);

                    if (this.wallets.length > 0) {
                        this.hasWallet = true;
                        const lastUsedWallet = localStorage.getItem('Network:Wallet');

                        // tslint:disable-next-line:forin
                        for (const wallet in this.wallets) {
                            const id = wallet;
                            const name = this.wallets[wallet].slice(0, -12);
                            const account = { id: id, name: name };

                            this.accounts.push(account);

                            if (lastUsedWallet && lastUsedWallet === name) {
                                this.selectedAccount = account;
                            }

                            // this.wallets[wallet] = this.wallets[wallet].slice(0, -12);
                        }

                        // If no wallet has been selected, pick the first one.
                        if (!this.selectedAccount) {
                            this.selectedAccount = this.accounts[0];
                        }

                    } else {
                        this.hasWallet = false;
                    }

                    this.cd.markForCheck();
                    // }
                },
                error => {
                    this.apiService.handleException(error);
                }
            );
    }

    unlock() {
        this.unlocking = true;

        this.globalService.setWalletName(this.selectedAccount.name);

        this.globalService.setCoinName('City Coin');
        this.globalService.setCoinUnit('CITY');

        this.getCurrentNetwork();

        const walletLoad = new WalletLoad(
            this.selectedAccount.name,
            this.password
        );

        this.loadWallet(walletLoad);
    }

    private getCurrentNetwork() {
        const walletInfo = new WalletInfo(this.globalService.getWalletName());

        this.apiService.getGeneralInfoOnce(walletInfo)
            .subscribe(
                response => {
                    // if (response.status >= 200 && response.status < 400) {
                    const responseMessage = response;

                    this.globalService.setNetwork(responseMessage.network);

                    if (responseMessage.network === 'CityMain') {
                        this.globalService.setCoinName('City');
                        this.globalService.setCoinUnit('CITY');
                    } else if (responseMessage.network === 'CityTest') {
                        this.globalService.setCoinName('CityTest');
                        this.globalService.setCoinUnit('TCITY');
                    } else if (responseMessage.network === 'CityRegTest') {
                        this.globalService.setCoinName('CityRegTest');
                        this.globalService.setCoinUnit('TCITY');
                    } else if (responseMessage.network === 'StratisMain') {
                        this.globalService.setCoinName('Stratis');
                        this.globalService.setCoinUnit('STRAT');
                    } else if (responseMessage.network === 'StratisTest') {
                        this.globalService.setCoinName('TestStratis');
                        this.globalService.setCoinUnit('TSTRAT');
                    } else if (responseMessage.network === 'Main') {
                        this.globalService.setCoinName('Bitcoin');
                        this.globalService.setCoinUnit('BTC');
                    } else if (responseMessage.network === 'Test') {
                        this.globalService.setCoinName('BitcoinTest');
                        this.globalService.setCoinUnit('TBTC');
                    }
                    // }
                },
                error => {
                    this.apiService.handleException(error);
                }
            );
    }

    private loadWallet(walletLoad: WalletLoad) {
        this.apiService.loadWallet(walletLoad)
            .subscribe(
                response => {
                    this.unlocking = false;

                    // if (response.status >= 200 && response.status < 400) {
                    this.authService.setAuthenticated();
                    this.wallet.start();

                    localStorage.setItem('Network:Wallet', this.wallet.walletName);

                    this.router.navigateByUrl('/dashboard');
                    // }
                },
                error => {
                    this.wallet.stop();
                    this.authService.setAnonymous();
                    this.unlocking = false;
                    this.apiService.handleException(error);
                }
            );
    }
}
