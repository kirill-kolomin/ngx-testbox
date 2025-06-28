import { Component } from '@angular/core';
import { MessageService } from '../message.service';
import {NgForOf, NgIf} from '@angular/common';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  imports: [
    NgForOf,
    NgIf
  ],
  styleUrls: ['./messages.component.css']
})
export class MessagesComponent {

  constructor(public messageService: MessageService) {}

}


/*
Copyright Google LLC. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at https://angular.io/license
*/
