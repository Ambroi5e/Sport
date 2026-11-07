/**
 * Opérations de séance passées par la file d'attente : enregistrer ou retirer
 * une série, retirer un exercice. Chaque opération est rattachée à sa séance.
 */
import { deleteSet, removeExerciseFromWorkout, saveSet, type SetInput } from "@/app/(app)/entrainement/actions";
import { push, registerSender } from "@/lib/offline/outbox";

export type SessionOp =
  | { kind: "set.save"; data: SetInput }
  | { kind: "set.delete"; data: { id: string; workoutId: string } }
  | { kind: "exercise.remove"; data: { workoutId: string; order: number } };

/** Déclare à la file comment envoyer chaque opération de séance. Sans effet si c'est déjà fait. */
export function registerSessionSenders() {
  registerSender<SetInput>("set.save", (data) => saveSet(data));
  registerSender<{ id: string }>("set.delete", (data) => deleteSet(data.id));
  registerSender<{ workoutId: string; order: number }>("exercise.remove", (data) => removeExerciseFromWorkout(data.workoutId, data.order));
}

export const setKey = (setId: string) => `set:${setId}`;

export function queueSaveSet(userId: string, input: SetInput) {
  push({ key: setKey(input.id), scope: input.workoutId, userId, payload: { kind: "set.save", data: input } });
}

export function queueDeleteSet(userId: string, workoutId: string, setId: string) {
  push({ key: setKey(setId), scope: workoutId, userId, payload: { kind: "set.delete", data: { id: setId, workoutId } } });
}

export function queueRemoveExercise(userId: string, workoutId: string, order: number) {
  push({ key: `exercice:${workoutId}:${order}`, scope: workoutId, userId, payload: { kind: "exercise.remove", data: { workoutId, order } } });
}
