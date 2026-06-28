import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskTypeRadioComponent } from './task-type-radio.component';

describe('TaskTypeRadioComponent', () => {
  let fixture: ComponentFixture<TaskTypeRadioComponent>;
  let component: TaskTypeRadioComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskTypeRadioComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskTypeRadioComponent);
    component = fixture.componentInstance;
  });

  it('選択中の種別を表示し、変更した種別を通知する', () => {
    spyOn(component.valueChange, 'emit');
    fixture.componentRef.setInput('value', 'TODO');
    fixture.detectChanges();

    const inputs = Array.from(
      fixture.nativeElement.querySelectorAll('input')
    ) as HTMLInputElement[];
    expect(inputs[0].checked).toBeTrue();

    inputs[1].dispatchEvent(new Event('change'));

    expect(component.valueChange.emit).toHaveBeenCalledWith('SCHEDULE');
  });
});
