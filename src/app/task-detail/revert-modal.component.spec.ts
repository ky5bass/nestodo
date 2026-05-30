import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevertModalComponent } from './revert-modal.component';

describe('RevertModalComponent', () => {
  let fixture: ComponentFixture<RevertModalComponent>;
  let component: RevertModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RevertModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RevertModalComponent);
    component = fixture.componentInstance;
  });

  it('範囲外の進捗では確定しない', () => {
    spyOn(component.closed, 'emit');
    component.progress.set(100);

    component.confirm();

    expect(component.hasError()).toBeTrue();
    expect(component.closed.emit).not.toHaveBeenCalled();
  });

  it('確定時に進捗を返し、キャンセル時にconfirmed=falseを返す', () => {
    spyOn(component.closed, 'emit');
    component.progress.set(42);

    component.confirm();
    component.cancel();

    expect(component.closed.emit).toHaveBeenCalledWith({ confirmed: true, progress: 42 });
    expect(component.closed.emit).toHaveBeenCalledWith({ confirmed: false });
  });
});
