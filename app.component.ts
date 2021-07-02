import { Component, OnInit, EventEmitter, ViewEncapsulation } from '@angular/core';
import {FormControl} from '@angular/forms';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { FormGroup, FormBuilder, Validators } from "@angular/forms";
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('slide', [
      state('left', style({ transform: 'translateX(0)' })),
      state('right', style({ transform: 'translateX(-50%)' })),
      transition('* => *', animate(300))
    ])
  ]
})
export class AppComponent{
  title = 'hw8-app';

  onDetail = 'left';
  setLeft() {
    this.onDetail = 'left';
  }
  setRight() {
    this.onDetail = 'right';
  }

  constructor(private http: HttpClient) {}

  myControl = new FormControl();
  options: string[] = [];
  filteredOptions?: Observable<string[]>;

  displayFn(user: string): string {
    return user ? user : '';
  }

  private _filter(name: string): string[] {
    const filterValue = name.toLowerCase();

    return this.options.filter(option => option.toLowerCase().indexOf(filterValue) === 0);
  }

  keywordChange(value: any): void {
    if (value != null) {
      if (value.value != "") {
        let returned;
        this.http.get("https://app.ticketmaster.com/discovery/v2/suggest?apikey=7PhcQTBX7M3JrEdFwRNzTYmOGcAjFx0P&keyword=" + value.value).subscribe({
          next: data => {
            returned = data;
            if (!('_embedded' in returned)) {
              this.options = [];
            }
            else {
              for (var item in returned._embedded.attractions) {
                this.options.push(returned._embedded.attractions[item].name);
              }
              this.filteredOptions = this.myControl.valueChanges
                .pipe(
                  startWith(''),
                  map(value => typeof value === 'string' ? value : value.name),
                  map(name => name ? this._filter(name) : this.options.slice()),
              );
            }
          },
          error: error => {
            console.error(error);
          }
        });
      }
      else {
        this.options = [];
      }
    }
  }
}
